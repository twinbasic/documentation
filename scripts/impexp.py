#!/usr/bin/env python3
# Copyright (c) 2026 TWINBASIC LTD
# SPDX-License-Identifier: MIT
"""
impexp.py -- standalone twinproj/twinpack export/import tool.
No external dependencies; requires Python 3.6+.

The command line is the twinBASIC compiler executable's own. The project
file always comes first, and the verb says what happens to it: `export`
takes its source out into a folder, `import` puts a folder's source into it.
Earlier versions of this script used `import` and `export` the other way
round.

Usage:
  python impexp.py export <project> <folder> [--overwrite]
  python impexp.py import <project> <folder> [--overwrite]
  python impexp.py settings|licence|changelog|readme <project>
  python impexp.py --self-test
  python impexp.py --help

The exit code says why a command failed, and whether it warned; the usage
message lists the codes.
"""

import json
import os
import re
import stat
import struct
import sys

MAGIC = 0xEA0BA51C
FORMAT_VERSION = 1

FLAGS_NONE = 0x00000000
FLAGS_HIDDEN = 0x00000001
FLAGS_SUPER_HIDDEN = 0x00000002
FLAGS_VIRTUAL = 0x00000004

CATEGORY_DEFAULT = 0x00
CATEGORY_REFERENCES = 0x01  # always virtual; never present in serialized files
CATEGORY_RESOURCES = 0x02
CATEGORY_SOURCES = 0x03
CATEGORY_SETTINGS = 0x04
CATEGORY_IMPORTED_TYPE_LIBRARIES = 0x05
CATEGORY_MISCELLANEOUS = 0x06
CATEGORY_PACKAGES = 0x07

# Well-known entry names that get a non-default category on import, at any
# depth -- an embedded package's own Sources and Settings carry them too.
# References is intentionally excluded -- it is materialised virtually by
# the IDE, never serialized, and tagging an on-disk folder with category
# 0x01 would confuse the IDE when it opens the project.
CATEGORY_BY_NAME = {
    'Resources': CATEGORY_RESOURCES,
    'Sources': CATEGORY_SOURCES,
    'Settings': CATEGORY_SETTINGS,
    'ImportedTypeLibraries': CATEGORY_IMPORTED_TYPE_LIBRARIES,
    'Miscellaneous': CATEGORY_MISCELLANEOUS,
    'Packages': CATEGORY_PACKAGES,
}

# Extensions of the code files, which the IDE stores with CRLF line endings.
# Import converts LF to CRLF in these, as the compiler executable's own import
# does, so a tree that Git or an editor left with LF line endings still packs
# correctly. Every other file -- resources in particular -- is stored
# byte-for-byte.
CRLF_EXTENSIONS = ('.twin', '.bas', '.cls')

# The files at the root of a project that the four printing commands write
# out. The compiler matches these names without regard to case, and only at
# the root.
DOCUMENTS = {
    'settings': 'Settings',
    'licence': 'LICENCE.md',
    'changelog': 'CHANGELOG.md',
    'readme': 'README.md',
}

# The IDE's editor state: open editors, cursor positions, watches. The
# compiler's export leaves it out and so does this one, so the two write the
# same tree. Import packs one if the folder holds it.
META_NAME = '.meta'

# Git's own folder is never packed and never written. The compiler's import
# packs whatever the folder holds, so a tree at the top of a repository puts
# the whole repository into the project file -- and the next export with
# --overwrite writes it back over the live one.
GIT_NAME = '.git'

PROJECT_FILE = re.compile(r'\.(twinproj|twinpack)$', re.IGNORECASE)

# -------------------------- Parser (binary -> tree) --------------------------


def parse(data):
    pos = [0]

    def need(n):
        if pos[0] + n > len(data):
            raise ValueError('the file ends too soon')

    def read_u64():
        need(8); v, = struct.unpack_from('<Q', data, pos[0]); pos[0] += 8; return v

    def read_u32():
        need(4); v, = struct.unpack_from('<I', data, pos[0]); pos[0] += 4; return v

    def read_i16():
        need(2); v, = struct.unpack_from('<h', data, pos[0]); pos[0] += 2; return v

    def read_u8():
        need(1); v = data[pos[0]]; pos[0] += 1; return v

    def read_bytes(n):
        need(n); b = data[pos[0]:pos[0] + n]; pos[0] += n; return b

    def read_str():
        n = read_u32()
        return read_bytes(n).decode('utf-8', 'replace') if n else ''

    def read_blob():
        return bytes(read_bytes(read_u32()))

    magic = read_u32()
    if magic != MAGIC:
        raise ValueError(
            f'Bad magic: 0x{magic:08X}, expected 0x{MAGIC:08X}')

    entry_count = [0]

    def read_entry():
        # At the root this 2-byte field is the file format version;
        # everywhere else it is the entry kind (1 = file, 2 = directory).
        kind = read_i16()
        entry_count[0] += 1
        is_root = (entry_count[0] == 1)
        if is_root and kind != FORMAT_VERSION:
            raise ValueError(
                f'Unsupported file format version: {kind}, '
                f'expected {FORMAT_VERSION}')

        name = read_str()
        revision = read_u64()
        flags = read_u32()
        category = read_u8()

        if kind == 1 and not is_root:
            content = read_blob()
            revision_count = read_u32()
            revisions = [read_u32() for _ in range(revision_count)]
            return dict(kind='file', name=name, revision=revision,
                        flags=flags, category=category,
                        content=content, revisions=revisions)

        count = read_u32()
        children = [read_entry() for _ in range(count)]
        return dict(kind='directory', name=name, revision=revision,
                    flags=flags, category=category, children=children)

    return read_entry()


# -------------------------- Serializer (tree -> binary) ----------------------


def serialize(root):
    chunks = []

    def write_u64(v):
        chunks.append(struct.pack('<Q', v))

    def write_u32(v):
        chunks.append(struct.pack('<I', v))

    def write_i16(v):
        chunks.append(struct.pack('<h', v))

    def write_u8(v):
        chunks.append(struct.pack('B', v))

    def write_str(s):
        enc = s.encode('utf-8')
        write_u32(len(enc))
        if enc:
            chunks.append(enc)

    def write_blob(d):
        write_u32(len(d))
        if d:
            chunks.append(bytes(d))

    write_u32(MAGIC)
    is_first = [True]

    def write_entry(entry):
        is_root = is_first[0]
        is_first[0] = False

        if entry['kind'] == 'file' and not is_root:
            write_i16(1)
            write_str(entry['name'])
            write_u64(entry.get('revision', 0x0002))
            write_u32(entry.get('flags', FLAGS_NONE))
            write_u8(entry.get('category', 0x00))
            write_blob(entry['content'])
            revisions = entry.get('revisions', [])
            write_u32(len(revisions))
            for r in revisions:
                write_u32(r)
        else:
            # Root entry writes the format version; non-root directory
            # writes kind=2.
            write_i16(FORMAT_VERSION if is_root else 2)
            write_str(entry['name'])
            write_u64(entry.get('revision', 0x0000))
            write_u32(entry.get('flags', FLAGS_NONE))
            write_u8(entry.get('category', 0x00))
            children = entry.get('children', [])
            write_u32(len(children))
            for child in children:
                write_entry(child)

    write_entry(root)
    return b''.join(chunks)


# -------------------------- Shared helpers -----------------------------------


class Refusal(Exception):
    """A refusal the command line reports as ERROR: lines, with nothing written.

    Its reason is one of the EXIT keys below.
    """

    def __init__(self, reason, message, details=()):
        super().__init__(message)
        self.reason = reason
        self.message = message
        self.details = list(details)


# The exit code says what happened, so a caller never has to read the output:
# why a run failed, and whether a run that did its work warned. The compiler
# executable exits 0 after every failure it reports, so no script can have
# relied on its exit code, and these cost nothing in compatibility.
EXIT = {'done': 0, 'failed': 1, 'usage': 2, 'exists': 3, 'missing': 4,
        'invalid': 5, 'warned': 6}


def exit_code_for(outcome):
    if isinstance(outcome, BaseException):
        if isinstance(outcome, Refusal):
            return EXIT[outcome.reason]
        return EXIT['failed']
    if outcome.get('stale') or outcome.get('repeated'):
        return EXIT['warned']
    return EXIT['done']


def _count(n, noun):
    return f'{n} {noun}{"" if n == 1 else "s"}'


def _path_key(p):
    # Paths compare without regard to case on Windows, as the file system does.
    return os.path.normcase(os.path.abspath(p))


def _kind_of(p):
    try:
        mode = os.stat(p).st_mode
    except (OSError, ValueError):
        return None
    return 'folder' if stat.S_ISDIR(mode) else 'file'


def _listed(paths):
    # At most ten, so a refusal over a whole tree stays readable.
    shown = list(paths[:10])
    if len(paths) > len(shown):
        shown.append(f'... and {len(paths) - len(shown)} more')
    return shown


def read_project(path):
    if _kind_of(path) == 'folder':
        raise Refusal('invalid', f'{path} is a folder, not a project file')
    try:
        with open(path, 'rb') as f:
            data = f.read()
    except FileNotFoundError:
        raise Refusal('missing', f'project file does not exist: {path}')
    try:
        return parse(data)
    except Exception as e:
        raise Refusal('invalid',
                      f'{path} is damaged or is not a project file: {e}')


def _write_replacing(path, data):
    # Replaces the file only once the new one is complete, so a failed write
    # leaves the old project file as it was.
    tmp = f'{path}.{os.getpid()}.tmp'
    try:
        with open(tmp, 'wb') as f:
            f.write(data)
        os.replace(tmp, path)
    except BaseException:
        try:
            os.remove(tmp)
        except OSError:
            pass
        raise


HINT_EXPORT = ['export writes the project into the folder.',
               'To write the folder into the project instead, use import.']
HINT_IMPORT = ['import replaces the project file with the folder.',
               'To write the project into the folder instead, use export.']

# -------------------------- Export (binary -> disk) --------------------------

# A name the project holds becomes one component of a path on disk, so it has
# to be exactly one: `..`, `a/b` or `C:x` would put a file outside the folder,
# and Windows drops a trailing dot or space, which turns `.. ` into `..`.
# Nothing the IDE writes breaks these rules.
_UNSAFE_CHARS = re.compile(r'[\\/:*?"<>|\x00-\x1f]')


def _is_safe_name(name):
    return (name != '' and not _UNSAFE_CHARS.search(name)
            and not name.endswith(('.', ' ')))


def export_project(project_path, folder, overwrite=False):
    root = read_project(project_path)

    # Everything is checked before anything is written, so a refusal leaves
    # the folder exactly as it was.
    folders, files, skipped, repeated = [], [], [], []
    in_project = {}  # lower-case path -> kind and path of its first entry

    def collect(d, rel):
        for entry in d['children']:
            entry_rel = f"{rel}/{entry['name']}" if rel else entry['name']
            if not _is_safe_name(entry['name']):
                raise Refusal('invalid',
                              'the project holds a name that cannot be '
                              'written safely: '
                              + json.dumps(entry_rel, ensure_ascii=False))
            # A project can hold one name more than once -- the IDE has
            # written both the VB package and one of its own samples that
            # way -- and a folder cannot. The first entry wins, as it does
            # with the compiler's export --overwrite, and a repeated folder
            # merges into the first.
            first = in_project.get(entry_rel.lower())
            if first:
                if first['kind'] != entry['kind']:
                    raise Refusal('invalid',
                                  'the project holds a file and a folder '
                                  f'with the same name: {entry_rel}')
                if entry['kind'] == 'directory':
                    collect(entry, first['rel'])
                elif first['rel'] not in repeated:
                    repeated.append(first['rel'])
                continue
            in_project[entry_rel.lower()] = dict(kind=entry['kind'],
                                                 rel=entry_rel)
            if entry['name'].lower() == GIT_NAME:
                skipped.append(dict(rel=entry_rel, why="Git's own folder"))
            elif entry['kind'] == 'directory':
                folders.append(entry_rel)
                collect(entry, entry_rel)
            elif entry['name'] != META_NAME:
                files.append((entry_rel, entry['content']))

    collect(root, '')

    def on_disk(rel):
        return os.path.join(folder, *rel.split('/'))

    if _kind_of(folder) == 'file':
        raise Refusal('failed', f'{folder} is a file, not a folder')
    in_the_way, existing = [], []
    for rel in folders:
        if _kind_of(on_disk(rel)) == 'file':
            in_the_way.append(on_disk(rel))
    for rel, _ in files:
        k = _kind_of(on_disk(rel))
        if k == 'folder':
            in_the_way.append(on_disk(rel))
        elif k == 'file':
            existing.append(on_disk(rel))
    if in_the_way:
        raise Refusal('failed',
                      'the folder has a file where the project has a '
                      'folder, or the reverse:', _listed(in_the_way))
    if existing and not overwrite:
        raise Refusal(
            'exists',
            f'{_count(len(existing), "file")} already '
            f'{"exists" if len(existing) == 1 else "exist"}, '
            'and --overwrite is not set:',
            _listed(existing) + HINT_EXPORT)

    os.makedirs(folder, exist_ok=True)
    for rel in folders:
        os.makedirs(on_disk(rel), exist_ok=True)
    for rel, content in files:
        with open(on_disk(rel), 'wb') as f:
            f.write(content)

    # Export never deletes, and the compiler's does not either. A file the
    # project no longer has stays in the folder, and the next import packs it
    # straight back in, so say which ones they are.
    source = _path_key(project_path)
    stale = []

    def scan(d, rel):
        for name in sorted(os.listdir(d)):
            if name.lower() == GIT_NAME:
                continue
            full = os.path.join(d, name)
            entry_rel = f'{rel}/{name}' if rel else name
            if _kind_of(full) == 'folder':
                scan(full, entry_rel)
            elif (entry_rel.lower() not in in_project
                  and _path_key(full) != source):
                stale.append(full)

    scan(folder, '')
    return dict(name=root['name'], files=len(files), folders=len(folders),
                skipped=skipped, repeated=repeated, stale=stale)


# -------------------------- Import (disk -> binary) --------------------------


def _category_for(name):
    return CATEGORY_BY_NAME.get(name, CATEGORY_DEFAULT)


def _to_crlf(name, content):
    if os.path.splitext(name)[1].lower() not in CRLF_EXTENSIONS:
        return content
    return content.replace(b'\r\n', b'\n').replace(b'\n', b'\r\n')


def _project_name_in(settings_path):
    # The IDE names the root entry after the project; every project and
    # package an installation ships agrees with its own Settings on that. The
    # folder's name is the fallback, for a Settings file without one.
    try:
        with open(settings_path, encoding='utf-8-sig') as f:
            name = json.load(f).get('project.name')
    except (OSError, ValueError, AttributeError):
        return None
    return name if isinstance(name, str) and name else None


def _build_tree(dir_path, rel, self_key, skipped):
    subdirs, files = [], []
    for name in sorted(os.listdir(dir_path)):
        full = os.path.join(dir_path, name)
        entry_rel = f'{rel}/{name}' if rel else name
        if name.lower() == GIT_NAME:
            skipped.append(dict(rel=entry_rel, why="Git's own folder"))
            continue
        mode = os.stat(full).st_mode
        if stat.S_ISDIR(mode):
            subdirs.append(name)
        elif not stat.S_ISREG(mode):
            continue
        elif _path_key(full) == self_key:
            skipped.append(dict(rel=entry_rel, why='the project file itself'))
        else:
            files.append(name)

    children = []
    for d in subdirs:
        children.append(_build_tree(os.path.join(dir_path, d),
                                    f'{rel}/{d}' if rel else d,
                                    self_key, skipped))
    for f in files:
        with open(os.path.join(dir_path, f), 'rb') as fh:
            content = fh.read()
        children.append(dict(
            kind='file', name=f,
            revision=0x0002, flags=FLAGS_NONE,
            category=_category_for(f),
            content=_to_crlf(f, content), revisions=[],
        ))
    name = os.path.basename(dir_path)
    return dict(
        kind='directory', name=name,
        revision=0x0000, flags=FLAGS_NONE,
        category=_category_for(name),
        children=children,
    )


def import_project(project_path, folder, overwrite=False):
    # Everything is checked before the tree is read, so a refusal leaves the
    # project file exactly as it was.
    if _kind_of(folder) != 'folder':
        raise Refusal('missing', f'input folder does not exist: {folder}',
                      HINT_IMPORT)
    settings = os.path.join(folder, 'Settings')
    if _kind_of(settings) != 'file':
        raise Refusal('invalid', f'{folder} has no Settings file, so it is '
                      'not the top folder of a project', HINT_IMPORT)
    existing = _kind_of(project_path)
    if existing == 'folder':
        raise Refusal('failed',
                      f'{project_path} is a folder, not a project file')
    if existing == 'file' and not overwrite:
        raise Refusal('exists', f'{project_path} already exists, and '
                      '--overwrite is not set', HINT_IMPORT)

    skipped = []
    root = _build_tree(os.path.abspath(folder), '', _path_key(project_path),
                       skipped)
    root['name'] = _project_name_in(settings) or root['name']
    root['category'] = CATEGORY_DEFAULT
    buf = serialize(root)
    _write_replacing(project_path, buf)

    tally = dict(files=0, folders=0)

    def count(e):
        for c in e['children']:
            if c['kind'] == 'file':
                tally['files'] += 1
            else:
                tally['folders'] += 1
                count(c)

    count(root)
    return dict(name=root['name'], size=len(buf), files=tally['files'],
                folders=tally['folders'], skipped=skipped)


# -------------------------- Printing a root document -------------------------


def read_document(project_path, verb):
    root = read_project(project_path)
    want = DOCUMENTS[verb]
    for entry in root['children']:
        if entry['kind'] == 'file' and entry['name'].lower() == want.lower():
            return entry['content']
    raise Refusal('missing', f'{project_path} has no {want}')


# -------------------------- Self-test ----------------------------------------


def _self_test():
    import shutil
    import tempfile

    tmp_dir = tempfile.mkdtemp(prefix='impexp-test-')
    print(f'Self-test  workdir: {tmp_dir}\n')

    passed = [0]
    failed = [0]

    def test(name, fn):
        try:
            fn()
            print(f'  [PASS] {name}')
            passed[0] += 1
        except Exception as e:
            print(f'  [FAIL] {name}\n         {e}')
            failed[0] += 1

    def eq(a, b, msg):
        if a != b:
            raise AssertionError(f'{msg}: expected {b!r}, got {a!r}')

    def refused(fn, pattern, reason):
        try:
            fn()
        except Refusal as e:
            if not re.search(pattern, e.message):
                raise AssertionError(f'refused for the wrong reason: {e.message}')
            if e.reason != reason:
                raise AssertionError(f'refused as {e.reason!r}, expected '
                                     f'{reason!r}: {e.message}')
            return
        raise AssertionError('was not refused')

    def at(*p):
        return os.path.join(tmp_dir, *p)

    def text(p):
        with open(p, 'rb') as f:
            return f.read().decode('latin-1')

    exists = os.path.exists

    # A small project in the shape the IDE writes.
    def file(name, content):
        return dict(kind='file', name=name, revision=2, flags=0,
                    category=_category_for(name),
                    content=content.encode('latin-1'), revisions=[])

    def folder(name, children):
        return dict(kind='directory', name=name, revision=0, flags=0,
                    category=_category_for(name), children=children)

    SETTINGS = '{\r\n\t"project.name": "Probe"\r\n}\r\n'

    def probe():
        return folder('Probe', [
            file('.meta', '{"rootFolder": "/Probe"}'),
            folder('ImportedTypeLibraries', []),
            folder('Miscellaneous', []),
            folder('Packages', []),
            file('README.md', '# Probe\r\n'),
            folder('Resources', [folder('ICON', [file('app.ico', '\x00\x01\r\n\x02\n')])]),
            file('Settings', SETTINGS),
            folder('Sources', [file('Form1.tbform', '{\n}\n'),
                               file('Module1.twin', 'Module Module1\r\nEnd Module\r\n')]),
        ])

    def write(p, tree):
        os.makedirs(os.path.dirname(p), exist_ok=True)
        with open(p, 'wb') as f:
            f.write(serialize(tree))
        return p

    def contents(tree):
        # Every file of a parsed tree by its path, the root's name left out.
        out = {}

        def walk(e, rel):
            for c in e['children']:
                r = f"{rel}/{c['name']}" if rel else c['name']
                if c['kind'] == 'file':
                    out[r] = c['content'].decode('latin-1')
                else:
                    out[r + '/'] = None
                    walk(c, r)

        walk(tree, '')
        return out

    def listing(tree):
        return json.dumps(sorted(contents(tree).items()))

    def disk_listing(d):
        out = []

        def walk(p, rel):
            for name in sorted(os.listdir(p)):
                full = os.path.join(p, name)
                r = f'{rel}/{name}' if rel else name
                if os.path.isdir(full):
                    out.append(r + '/')
                    walk(full, r)
                else:
                    out.append(f'{r}={text(full)}')

        walk(d, '')
        return '\n'.join(out)

    def read_parsed(p):
        with open(p, 'rb') as f:
            return parse(f.read())

    try:
        def t_memory():
            tree = probe()
            tree['children'][0]['flags'] = FLAGS_HIDDEN | FLAGS_VIRTUAL
            tree['children'][0]['revisions'] = [1, 2, 3]
            back = parse(serialize(tree))
            eq(back['name'], 'Probe', 'root name')
            eq(listing(back), listing(tree), 'contents')
            eq(back['children'][0]['flags'], FLAGS_HIDDEN | FLAGS_VIRTUAL, 'flags')
            eq(back['children'][0]['revisions'], [1, 2, 3], 'revision list')
        test('Parse and serialize round-trip in memory', t_memory)

        def t_idempotent():
            once = serialize(parse(serialize(probe())))
            eq(once == serialize(parse(once)), True, 'second pass differs')
        test('Serializing is idempotent', t_idempotent)

        def t_damaged():
            good = serialize(probe())
            damaged = dict(magic=b'not a project file',
                           short=good[:len(good) - 7], empty=b'')
            for name, data in damaged.items():
                p = at('damaged', f'{name}.twinproj')
                os.makedirs(os.path.dirname(p), exist_ok=True)
                with open(p, 'wb') as f:
                    f.write(data)
                refused(lambda: read_project(p), r'damaged or is not a project file',
                        'invalid')
        test('A damaged file is refused', t_damaged)

        proj = write(at('Probe.twinproj'), probe())
        tree = at('tree')

        def t_export():
            r = export_project(proj, tree)
            eq(text(os.path.join(tree, 'Settings')), SETTINGS, 'Settings')
            eq(text(os.path.join(tree, 'Sources', 'Module1.twin')),
               'Module Module1\r\nEnd Module\r\n', 'Module1.twin')
            eq(exists(os.path.join(tree, 'Packages')), True, 'empty folder')
            eq(exists(os.path.join(tree, '.meta')), False, '.meta')
            eq(f"{r['files']} {r['folders']} {len(r['stale'])}", '5 6 0',
               'files, folders, stale')
        test('Export writes every file but .meta', t_export)

        def t_import():
            out = at('Repacked.twinproj')
            import_project(out, tree)
            back = read_parsed(out)
            eq(back['name'], 'Probe', 'root name')
            eq(back['category'], CATEGORY_DEFAULT, 'root category')
            expected = probe()
            expected['children'].pop(0)  # .meta
            eq(listing(back), listing(expected), 'contents')
            sources = [c for c in back['children'] if c['name'] == 'Sources'][0]
            eq(sources['category'], CATEGORY_SOURCES, 'Sources category')
        test('Import packs the folder, naming the root from Settings', t_import)

        def t_fallback_name():
            bare = at('bare', 'MyTree')
            os.makedirs(bare)
            with open(os.path.join(bare, 'Settings'), 'w') as f:
                f.write('{}')
            out = at('bare', 'Bare.twinproj')
            import_project(out, bare)
            eq(read_parsed(out)['name'], 'MyTree', 'root name')
        test('Import names the root after the folder when Settings has no name',
             t_fallback_name)

        def t_export_refuses():
            os.remove(os.path.join(tree, 'Settings'))
            with open(os.path.join(tree, 'Sources', 'Module1.twin'), 'w') as f:
                f.write('CHANGED')
            refused(lambda: export_project(proj, tree), r'already exist', 'exists')
            eq(exists(os.path.join(tree, 'Settings')), False, 'Settings written anyway')
            eq(text(os.path.join(tree, 'Sources', 'Module1.twin')), 'CHANGED',
               'Module1.twin')
        test('Export without --overwrite refuses, and writes nothing',
             t_export_refuses)

        def t_export_overwrite():
            stale_file = os.path.join(tree, 'Sources', 'Stale.twin')
            with open(stale_file, 'wb') as f:
                f.write(b'Module Stale\r\nEnd Module\r\n')
            r = export_project(proj, tree, overwrite=True)
            eq(text(os.path.join(tree, 'Sources', 'Module1.twin')),
               'Module Module1\r\nEnd Module\r\n', 'Module1.twin')
            eq(exists(os.path.join(tree, 'Settings')), True, 'Settings')
            eq(r['stale'], [stale_file], 'files the project lacks')
            os.remove(stale_file)
        test('Export --overwrite replaces files and names the ones the project lacks',
             t_export_overwrite)

        def t_import_refuses():
            with open(proj, 'rb') as f:
                before = f.read()
            refused(lambda: import_project(proj, tree), r'already exists', 'exists')
            with open(proj, 'rb') as f:
                eq(f.read() == before, True, 'project file changed')
        test('Import without --overwrite refuses, and leaves the project alone',
             t_import_refuses)

        def t_no_settings():
            no_settings = at('nosettings')
            os.makedirs(no_settings)
            with open(os.path.join(no_settings, 'Module1.twin'), 'w') as f:
                f.write('x')
            refused(lambda: import_project(at('NoSettings.twinproj'), no_settings),
                    r'no Settings file', 'invalid')
            refused(lambda: import_project(at('Missing.twinproj'), at('missing')),
                    r'does not exist', 'missing')
            eq(exists(at('NoSettings.twinproj')), False, 'a project file was written')
        test('Import refuses a folder with no Settings file', t_no_settings)

        def t_skips():
            os.makedirs(os.path.join(tree, '.git'))
            with open(os.path.join(tree, '.git', 'HEAD'), 'w') as f:
                f.write('ref: refs/heads/main\n')
            inside = os.path.join(tree, 'Inside.twinproj')
            import_project(inside, tree)
            r = import_project(inside, tree, overwrite=True)
            eq(bool(re.search(r'\.git|Inside', listing(read_parsed(inside)))), False,
               'packed anyway')
            eq(','.join(s['rel'] for s in r['skipped']), '.git,Inside.twinproj',
               'skipped')
            os.remove(inside)
            shutil.rmtree(os.path.join(tree, '.git'))
        test('Import skips .git and the project file itself', t_skips)

        def t_unsafe():
            for bad in ['..', 'a/b', 'a\\b', 'C:x', 'x.', 'x ', '']:
                p = write(at('unsafe', 'Unsafe.twinproj'),
                          folder('Unsafe', [file('Settings', '{}'),
                                            folder('Sources', [file(bad, 'x')])]))
                refused(lambda: export_project(p, at('unsafe', 'out')),
                        r'cannot be written safely', 'invalid')
            eq(exists(at('unsafe', 'out')), False, 'something was written')
        test('Export refuses a name that would leave the folder', t_unsafe)

        def t_twice():
            p = write(at('twice', 'Twice.twinproj'), folder('Twice', [
                file('Settings', '{}'),
                folder('Sources', [file('A.twin', 'first'), file('a.twin', 'second'),
                                   file('B.twin', 'first')]),
                folder('Sources', [file('B.twin', 'second'), file('C.twin', 'merged')]),
            ]))
            out = at('twice', 'out')
            r = export_project(p, out)
            eq(text(os.path.join(out, 'Sources', 'A.twin')), 'first', 'A.twin')
            eq(text(os.path.join(out, 'Sources', 'B.twin')), 'first', 'B.twin')
            eq(text(os.path.join(out, 'Sources', 'C.twin')), 'merged', 'C.twin')
            eq(','.join(r['repeated']), 'Sources/A.twin,Sources/B.twin', 'names reported')
            clash = write(at('twice', 'Clash.twinproj'),
                          folder('Clash', [file('Settings', '{}'), file('Sources', 'x'),
                                           folder('Sources', [])]))
            refused(lambda: export_project(clash, at('twice', 'clash')),
                    r'a file and a folder with the same name', 'invalid')
        test('Export writes the first of two entries with one name, and says so',
             t_twice)

        def t_eol():
            src = at('eol', 'Eol')
            files = {
                'Settings': (b'{\n}\n', '{\n}\n'),
                'Sources/Lf.twin': (b'A\nB\n', 'A\r\nB\r\n'),
                'Sources/Mixed.BAS': (b'A\r\nB\nC', 'A\r\nB\r\nC'),
                'Sources/Crlf.cls': (b'A\r\nB\r\n', 'A\r\nB\r\n'),
                'Sources/Form.tbform': (b'{\n}\n', '{\n}\n'),
                'Resources/RCDATA/data.txt': (b'A\nB\n', 'A\nB\n'),
            }
            for rel, (before, _) in files.items():
                p = os.path.join(src, *rel.split('/'))
                os.makedirs(os.path.dirname(p), exist_ok=True)
                with open(p, 'wb') as f:
                    f.write(before)
            out = at('eol', 'Eol.twinproj')
            import_project(out, src)
            got = contents(read_parsed(out))
            for rel, (_, after) in files.items():
                eq(got.get(rel), after, rel)
        test('Import converts LF to CRLF in code files only', t_eol)

        def t_documents():
            eq(read_document(proj, 'readme').decode('latin-1'), '# Probe\r\n', 'readme')
            eq(read_document(proj, 'settings').decode('latin-1'), SETTINGS, 'settings')
            refused(lambda: read_document(proj, 'licence'), r'has no LICENCE\.md',
                    'missing')
            lower = write(at('docs', 'Lower.twinproj'),
                          folder('Lower', [file('changelog.MD', 'log'),
                                           folder('Sources', [file('README.md', 'not at the root')])]))
            eq(read_document(lower, 'changelog').decode('latin-1'), 'log',
               'changelog, lower case')
            refused(lambda: read_document(lower, 'readme'), r'has no README\.md',
                    'missing')
        test('The printing commands read the documents at the root', t_documents)

        def t_command_line():
            bad = [
                ('export', ['tree/', 'P.twinproj']),
                ('import', ['P.twinproj', 'Q.twinpack']),
                ('import', ['P.twinproj']),
                ('EXPORT', ['P.twinproj', 'tree']),
                ('license', ['P.twinproj']),
                ('settings', ['P.twinproj', 'extra']),
                (None, []),
            ]
            for verb, args in bad:
                eq(command_line_error(verb, args) is None, False, f'{verb} {" ".join(args)}')
            eq(command_line_error('export', ['P.TWINPACK', 'tree/']), None,
               'export P.TWINPACK tree/')
            eq(command_line_error('readme', ['P.twinproj']), None, 'readme P.twinproj')
        test('A command line in the wrong shape is refused before anything is read',
             t_command_line)

        def t_exit_codes():
            eq(','.join(str(v) for v in EXIT.values()), '0,1,2,3,4,5,6',
               'the documented codes')
            refused(lambda: read_project(at('nowhere.twinproj')), r'does not exist',
                    'missing')
            eq(exit_code_for(Refusal('exists', 'x')), EXIT['exists'], 'a refusal')
            eq(exit_code_for(OSError('EACCES')), EXIT['failed'], 'any other error')
            eq(exit_code_for(dict(stale=['Sources/Old.twin'], repeated=[])),
               EXIT['warned'], 'a file the project lacks')
            eq(exit_code_for(dict(stale=[], repeated=['Sources/A.twin'])),
               EXIT['warned'], 'a repeated name')
            eq(exit_code_for(dict(skipped=[dict(rel='.git')])), EXIT['done'],
               'a skipped .git')
        test('The exit code says why a command failed, and that it warned',
             t_exit_codes)

        # The documentation repository's own sample, when run from a checkout.
        script_dir = os.path.dirname(os.path.abspath(__file__))
        sample_path = os.path.join(script_dir, '..', 'indexer', 'sample.twinpack')
        if not os.path.isfile(sample_path):
            print('  [SKIP] sample.twinpack -- only in a checkout of the '
                  'documentation repository')
        else:
            def t_sample():
                root = read_parsed(sample_path)
                eq(root['name'], 'CustomControlsPackage', 'root name')
                tally = dict(files=0, dirs=0)

                def cnt(e):
                    for c in e['children']:
                        if c['kind'] == 'file':
                            tally['files'] += 1
                        else:
                            tally['dirs'] += 1
                            cnt(c)

                cnt(root)
                eq(tally['files'], 22, 'file count')
                eq(tally['dirs'], 7, 'dir count')
            test('Parse sample.twinpack', t_sample)

            def t_sample_disk():
                a, b = at('sample', 'a'), at('sample', 'b')
                rt = at('sample', 'rt.twinpack')
                export_project(sample_path, a)
                import_project(rt, a)
                export_project(rt, b)
                eq(disk_listing(b) == disk_listing(a), True, 'the two trees differ')
                eq(read_parsed(rt)['name'], 'CustomControlsPackage', 'root name')
            test('sample.twinpack survives export, import and export again',
                 t_sample_disk)

    finally:
        shutil.rmtree(tmp_dir, ignore_errors=True)

    print(f'\n{passed[0]}/{passed[0] + failed[0]} tests passed.')
    return 1 if failed[0] else 0


# -------------------------- CLI ----------------------------------------------

USAGE = """\
Usage:
  impexp export <project> <folder> [--overwrite]   unpack the project file into the folder
  impexp import <project> <folder> [--overwrite]   pack the folder into the project file
  impexp settings <project>                        print the project's Settings
  impexp licence <project>                         print the project's LICENCE.md
  impexp changelog <project>                       print the project's CHANGELOG.md
  impexp readme <project>                          print the project's README.md
  impexp --self-test                               run the built-in tests
  impexp --help                                    print this message

<project> is a .twinproj or .twinpack file. It always comes first, and the
verb says what happens to it: export takes source out, import puts source in.
The commands and their arguments are those of the tB executable,
twinBASIC_win32.exe.

The exit code says what happened, so the output need not be read:
  0  done
  1  failed for another reason, such as a file that could not be written
  2  a mistake in the command line
  3  refused, because a file exists and --overwrite is not set
  4  the project file, the folder or the file to print does not exist
  5  the project file is damaged or is not one, or the folder has no Settings
  6  done, with a warning: the folder holds files the project does not,
     or the project holds one name twice"""

ARGUMENTS = {
    'export': ['project', 'folder'],
    'import': ['project', 'folder'],
    'settings': ['project'],
    'licence': ['project'],
    'changelog': ['project'],
    'readme': ['project'],
}


def command_line_error(verb, args):
    """What is wrong with the command line, or None.

    Strict on purpose: the project file has to be named as one and the folder
    must not be, so arguments given in the wrong order -- the order this
    script took before it adopted the compiler's verbs -- stop here instead of
    reaching the disk.
    """
    if verb is None:
        return 'no command given'
    if verb not in ARGUMENTS:
        return f'unknown command: {verb}'
    want = ARGUMENTS[verb]
    if len(args) != len(want):
        return f'{verb} takes ' + ' '.join(f'<{w}>' for w in want)
    project = args[0]
    folder = args[1] if len(args) > 1 else None
    if not PROJECT_FILE.search(project):
        return (f'not a .twinproj or .twinpack file: {project}'
                + ('' if folder is None else ' -- the project file comes first'))
    if folder is not None and PROJECT_FILE.search(folder.rstrip('\\/')):
        return f'{folder} names a project file, not a folder -- the folder comes second'
    return None


def _out(line):
    print(line)


def _err(line):
    # Flushed first, so the two streams interleave in order in one log.
    sys.stdout.flush()
    print(line, file=sys.stderr)


def _print_error(e):
    if isinstance(e, Refusal):
        _err(f'  ERROR: {e.message}')
        for line in e.details:
            _err(f'         {line}')
    else:
        _err(f'  ERROR: {e}')


def _usage_error(message):
    _err(f'ERROR: {message}\n\n{USAGE}')
    return EXIT['usage']


def main(argv):
    overwrite = False
    words = []
    show_help = run_self_test = False
    for a in argv:
        if a == '--overwrite':
            overwrite = True
        elif a == '--self-test':
            run_self_test = True
        elif a in ('--help', '-h'):
            show_help = True
        elif len(a) > 1 and a.startswith('-'):
            return _usage_error(f'unknown option: {a}')
        else:
            words.append(a)
    if show_help:
        _out(USAGE)
        return 0
    if run_self_test:
        if words:
            return _usage_error('--self-test takes no other arguments')
        return _self_test()

    verb = words[0] if words else None
    args = words[1:]
    problem = command_line_error(verb, args)
    if problem:
        return _usage_error(problem)
    project = args[0]
    folder = args[1] if len(args) > 1 else None

    if verb in ('export', 'import'):
        # The progress lines follow the compiler's, down to the last one: a
        # script that tests for `... DONE` works with either.
        _out(f'exporting from "{project}" to "{folder}"...' if verb == 'export'
             else f'importing into "{project}" from "{folder}"...')
        try:
            if verb == 'export':
                r = export_project(project, folder, overwrite=overwrite)
            else:
                r = import_project(project, folder, overwrite=overwrite)
            for s in r['skipped']:
                _out(f"  skipped {s['rel']} ({s['why']})")
            _out(f"  {_count(r['files'], 'file')}, {_count(r['folders'], 'folder')}"
                 + (f", {r['size']} bytes" if 'size' in r else ''))
            if r.get('repeated'):
                one = len(r['repeated']) == 1
                _err(f"  WARNING: {_count(len(r['repeated']), 'name')} "
                     f"{'occurs' if one else 'occur'} more than once in the "
                     'project, and a folder holds one of each, so only the '
                     'first was written:')
                for line in _listed(r['repeated']):
                    _err(f'           {line}')
            if r.get('stale'):
                one = len(r['stale']) == 1
                _err(f"  WARNING: {_count(len(r['stale']), 'file')} in the folder "
                     f"{'is' if one else 'are'} not in the project, and import "
                     f"would pack {'it' if one else 'them'} back in:")
                for line in _listed(r['stale']):
                    _err(f'           {line}')
            _out('... DONE')
            return exit_code_for(r)
        except Exception as e:
            _print_error(e)
            _out('... FAILED')
            return exit_code_for(e)

    try:
        data = read_document(project, verb)
    except Exception as e:
        _print_error(e)
        return exit_code_for(e)
    sys.stdout.buffer.write(data)
    sys.stdout.flush()
    return EXIT['done']


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
