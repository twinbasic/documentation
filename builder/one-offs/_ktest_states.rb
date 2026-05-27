require 'rouge'
load "D:/OCP/wc/twinBASIC-documentation/docs/_plugins/twinbasic.rb"

def test(label, code)
  puts "--- #{label} ---"
  puts Rouge::Formatters::HTML.new.format(Rouge::Lexers::TwinBasic.new.lex(code))
  puts
end

# :namespace state -- Option.md case
test ":namespace", <<~TB
  Module MyModule
      Option Private Module
  End Module
TB

# :dim state -- can it cascade?
test ":dim with newline before id", <<~TB
  Dim
  Foo As Long
  Exit Sub
TB

# :funcname state -- similar
test ":funcname with newline", <<~TB
  Function
  Foo As Long
  Exit Sub
TB

# :typename state -- similar
test ":typename with newline", <<~TB
  Class
  Foo
  Exit Sub
TB

# :end state -- looking for specific keyword
test ":end with newline before kw", <<~TB
  End
  Sub
  Exit Sub
TB

# :namespace with line continuation
test ":namespace with line cont", <<~TB
  Module _
      MyModule
  End Module
TB
