require 'rouge'
load "D:/OCP/wc/twinBASIC-documentation/docs/_plugins/twinbasic.rb"

# The exact code from On-Error.md
code = "Sub InitializeMatrix(Var1, Var2, Var3, Var4)\n    On Error GoTo ErrorHandler\n    . . .\n    Exit Sub\nErrorHandler:\n    . . .\n    Resume Next\nEnd Sub\n"
out = Rouge::Formatters::HTML.new.format(Rouge::Lexers::TwinBasic.new.lex(code))
# Look for the part around Exit Sub / ErrorHandler
m = out.index('Exit Sub')
puts out[[m-100, 0].max..m+200].to_s
