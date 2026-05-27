require 'rouge'
load "D:/OCP/wc/twinBASIC-documentation/docs/_plugins/twinbasic.rb"
code = <<~TB
  Module MyModule
      Option Private Module ' Indicates that the module is private.
  End Module
TB
puts Rouge::Formatters::HTML.new.format(Rouge::Lexers::TwinBasic.new.lex(code))
