#!/usr/bin/env python3
# Copyright (c) 2026 TWINBASIC LTD
# SPDX-License-Identifier: MIT
"""
impexp.py -- standalone twinpack/twinproj import/export tool.
No external dependencies; requires Python 3.6+.

Usage:
  python impexp.py import <file.twinproj|.twinpack> [output_dir]
  python impexp.py export <input_dir> <output.twinproj|.twinpack>
  python impexp.py --self-test
"""

import os
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

# Well-known entry names that get a non-default category on export.
# References is intentionally excluded -- it is materialised virtually by
# the IDE, never serialized, and tagging an on-disk folder with category
# 0x01 would confuse the IDE on import.
CATEGORY_BY_NAME = {
    'Resources': CATEGORY_RESOURCES,
    'Sources': CATEGORY_SOURCES,
    'Settings': CATEGORY_SETTINGS,
    'ImportedTypeLibraries': CATEGORY_IMPORTED_TYPE_LIBRARIES,
    'Miscellaneous': CATEGORY_MISCELLANEOUS,
    'Packages': CATEGORY_PACKAGES,
}

# -------------------------- Parser (binary -> tree) --------------------------


def parse(data):
    pos = [0]

    def read_u64():
        v, = struct.unpack_from('<Q', data, pos[0]); pos[0] += 8; return v

    def read_u32():
        v, = struct.unpack_from('<I', data, pos[0]); pos[0] += 4; return v

    def read_i16():
        v, = struct.unpack_from('<h', data, pos[0]); pos[0] += 2; return v

    def read_u8():
        v = data[pos[0]]; pos[0] += 1; return v

    def read_str():
        n = read_u32()
        if n == 0:
            return ''
        s = data[pos[0]:pos[0] + n].decode('utf-8')
        pos[0] += n
        return s

    def read_blob():
        n = read_u32()
        b = data[pos[0]:pos[0] + n]
        pos[0] += n
        return b

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


# -------------------------- Import (binary -> disk) --------------------------


def do_import(input_path, output_dir, *, quiet=False):
    with open(input_path, 'rb') as f:
        root = parse(f.read())

    if not output_dir:
        output_dir = root['name']

    file_count = 0
    dir_count = 0

    def extract(entry, parent_dir):
        nonlocal file_count, dir_count
        if entry['kind'] == 'file':
            with open(os.path.join(parent_dir, entry['name']), 'wb') as f:
                f.write(entry['content'])
            file_count += 1
        else:
            d = os.path.join(parent_dir, entry['name'])
            os.makedirs(d, exist_ok=True)
            dir_count += 1
            for child in entry['children']:
                extract(child, d)

    os.makedirs(output_dir, exist_ok=True)
    for child in root['children']:
        extract(child, output_dir)
    if not quiet:
        print(f'Imported "{root["name"]}" -> {output_dir}/'
              f'  ({file_count} files, {dir_count} directories)')
    return dict(name=root['name'], file_count=file_count, dir_count=dir_count)


# -------------------------- Export (disk -> binary) --------------------------


def _category_for(name):
    return CATEGORY_BY_NAME.get(name, CATEGORY_DEFAULT)


def _build_tree(dir_path):
    name = os.path.basename(os.path.abspath(dir_path))
    listing = sorted(os.listdir(dir_path))
    subdirs = [e for e in listing if os.path.isdir(os.path.join(dir_path, e))]
    files = [e for e in listing if os.path.isfile(os.path.join(dir_path, e))]

    children = []
    for d in subdirs:
        children.append(_build_tree(os.path.join(dir_path, d)))
    for f in files:
        with open(os.path.join(dir_path, f), 'rb') as fh:
            content = fh.read()
        children.append(dict(
            kind='file', name=f,
            revision=0x0002, flags=FLAGS_NONE,
            category=_category_for(f),
            content=content, revisions=[],
        ))
    return dict(
        kind='directory', name=name,
        revision=0x0000, flags=FLAGS_NONE,
        category=_category_for(name),
        children=children,
    )


def do_export(input_dir, output_path, *, quiet=False):
    root = _build_tree(input_dir)
    buf = serialize(root)
    with open(output_path, 'wb') as f:
        f.write(buf)

    file_count = 0
    dir_count = 0

    def count(e):
        nonlocal file_count, dir_count
        if e['kind'] == 'file':
            file_count += 1
        else:
            dir_count += 1
            for c in e['children']:
                count(c)

    for c in root['children']:
        count(c)
    if not quiet:
        print(f'Exported "{root["name"]}" -> {output_path}'
              f'  ({len(buf)} bytes, {file_count} files, {dir_count} directories)')
    return dict(name=root['name'], size=len(buf),
                file_count=file_count, dir_count=dir_count)


# -------------------------- Self-test ----------------------------------------


def _self_test():
    import shutil
    import tempfile

    script_dir = os.path.dirname(os.path.abspath(__file__))
    sample_path = os.path.join(script_dir, '..', 'indexer', 'sample.twinpack')
    if not os.path.isfile(sample_path):
        print(f'Sample not found: {sample_path}\n'
              f'(requires indexer/sample.twinpack from the repository)',
              file=sys.stderr)
        sys.exit(1)

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
            raise AssertionError(f'{msg}: expected {b}, got {a}')

    def tree_files(entry, prefix):
        if entry['kind'] == 'file':
            return [(prefix + entry['name'], entry['content'])]
        out = []
        for c in entry['children']:
            out.extend(tree_files(c, prefix + entry['name'] + '/'))
        out.sort(key=lambda x: x[0])
        return out

    def disk_files(d, prefix=''):
        out = []
        for e in sorted(os.listdir(d)):
            full = os.path.join(d, e)
            if os.path.isdir(full):
                out.extend(disk_files(full, prefix + e + '/'))
            elif os.path.isfile(full):
                with open(full, 'rb') as f:
                    out.append((prefix + e, f.read()))
        return out

    try:
        with open(sample_path, 'rb') as f:
            sample_buf = f.read()

        root = [None]

        def t_parse():
            root[0] = parse(sample_buf)
            eq(root[0]['name'], 'CustomControlsPackage', 'root name')
            fc = dc = 0
            def cnt(e):
                nonlocal fc, dc
                if e['kind'] == 'file': fc += 1
                else:
                    dc += 1
                    for c in e['children']: cnt(c)
            for c in root[0]['children']: cnt(c)
            eq(fc, 22, 'file count')
            eq(dc, 7, 'dir count')
        test('Parse sample.twinpack', t_parse)

        def t_inmem():
            buf2 = serialize(root[0])
            root2 = parse(buf2)
            f1, f2 = tree_files(root[0], ''), tree_files(root2, '')
            eq(len(f1), len(f2), 'file count')
            for i in range(len(f1)):
                eq(f1[i][0], f2[i][0], f'path[{i}]')
                if f1[i][1] != f2[i][1]:
                    raise AssertionError(f'content mismatch: {f1[i][0]}')
        test('In-memory round-trip (parse -> serialize -> re-parse)', t_inmem)

        def t_idempotent():
            once = serialize(parse(sample_buf))
            twice = serialize(parse(once))
            if once != twice:
                raise AssertionError(f'{len(once)} vs {len(twice)} bytes')
        test('Serializer idempotence (double round-trip)', t_idempotent)

        def t_disk():
            dir1 = os.path.join(tmp_dir, 'import1')
            rt_file = os.path.join(tmp_dir, 'roundtrip.twinpack')
            dir2 = os.path.join(tmp_dir, 'import2')
            do_import(sample_path, dir1, quiet=True)
            do_export(dir1, rt_file, quiet=True)
            do_import(rt_file, dir2, quiet=True)
            a, b = disk_files(dir1), disk_files(dir2)
            eq(len(a), len(b), 'file count')
            for i in range(len(a)):
                eq(a[i][0], b[i][0], f'path[{i}]')
                if a[i][1] != b[i][1]:
                    raise AssertionError(f'content mismatch: {a[i][0]}')
        test('Disk round-trip (import -> export -> re-import)', t_disk)

        def t_empty():
            tree = dict(kind='directory', name='Empty',
                        revision=0, flags=0, category=0, children=[])
            rt = parse(serialize(tree))
            eq(rt['name'], 'Empty', 'name')
            eq(len(rt['children']), 0, 'children')
        test('Empty project round-trip', t_empty)

        def t_single():
            content = b'Hello twinBASIC'
            tree = dict(kind='directory', name='Mini',
                        revision=0, flags=0, category=0,
                        children=[
                            dict(kind='file', name='test.twin',
                                 revision=2, flags=0, category=0,
                                 content=content, revisions=[]),
                        ])
            rt = parse(serialize(tree))
            eq(len(rt['children']), 1, 'children')
            eq(rt['children'][0]['name'], 'test.twin', 'filename')
            if rt['children'][0]['content'] != content:
                raise AssertionError('content mismatch')
        test('Single-file project round-trip', t_single)

        def t_flags():
            tree = dict(
                kind='directory', name='WithFlags',
                revision=0, flags=FLAGS_HIDDEN, category=0,
                children=[
                    dict(kind='file', name='h.twin',
                         revision=2, flags=FLAGS_HIDDEN | FLAGS_VIRTUAL,
                         category=0, content=b'x', revisions=[]),
                ])
            rt = parse(serialize(tree))
            eq(rt['flags'], FLAGS_HIDDEN, 'root flags')
            eq(rt['children'][0]['flags'],
               FLAGS_HIDDEN | FLAGS_VIRTUAL, 'file flags')
        test('Flags field preserved on round-trip', t_flags)

        def t_bad_magic():
            try:
                parse(b'not a twinpack!!')
                raise AssertionError('should have thrown')
            except ValueError as e:
                if 'Bad magic' not in str(e):
                    raise
        test('Bad magic rejected', t_bad_magic)

    finally:
        shutil.rmtree(tmp_dir)

    print(f'\n{passed[0]}/{passed[0] + failed[0]} tests passed.')
    if failed[0] > 0:
        sys.exit(1)


# -------------------------- CLI ----------------------------------------------

USAGE = """\
Usage:
  impexp import <file.twinproj|.twinpack> [output_dir]
  impexp export <input_dir> <output.twinproj|.twinpack>
  impexp --self-test"""


def main():
    args = sys.argv[1:]
    cmd = args[0] if args else ''
    rest = args[1:]

    if cmd == '--self-test':
        _self_test()
    elif cmd == 'import' and len(rest) >= 1:
        do_import(rest[0], rest[1] if len(rest) > 1 else None)
    elif cmd == 'export' and len(rest) >= 2:
        do_export(rest[0], rest[1])
    else:
        print(USAGE, file=sys.stderr)
        sys.exit(1)


if __name__ == '__main__':
    main()
