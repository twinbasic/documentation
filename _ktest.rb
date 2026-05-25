require 'rouge'
load "D:/OCP/wc/twinBASIC-documentation/docs/_plugins/twinbasic.rb"

def show(label, code)
  puts "=== #{label} ==="
  puts Rouge::Formatters::HTML.new.format(Rouge::Lexers::TwinBasic.new.lex(code))
  puts
end

show ". . . (current source)", "    . . .\n    Exit Sub\n"
show "... (contiguous dots)",  "    ...\n    Exit Sub\n"
show "' comment",              "    ' ...\n    Exit Sub\n"
