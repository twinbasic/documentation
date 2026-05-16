# -*- coding: utf-8 -*- #
# frozen_string_literal: true

require "rouge"

module Rouge
  module Lexers
    class TwinBasic < RegexLexer
      title "twinBASIC"
      desc "twinBASIC programming language (VB6/VBA compatible)"
      tag 'tb'
      aliases 'twinbasic', 'vba', 'vb'
      filenames '*.twin', '*.bas', '*.cls', '*.frm'
      mimetypes 'text/x-twinbasic', 'application/x-twinbasic'

      def self.keywords
        @keywords ||= Set.new %w(
          alias byref byval call case class close coclass const
          continue declare default delegate dim do each else elseif
          empty end endif enum erase error event exit extends
          false finally for friend function get global gosub
          goto handles if implements imports inherits input interface
          let lib line lock loop me mid module
          namespace new next nothing null of on open option optional
          overloads paramarray preserve print private property public
          put raiseevent redim resume return select set
          shared static step stop structure sub
          then throw to true try type unlock until
          using wend when while width
          with withevents write
        )
      end

      def self.keywords_type
        @keywords_type ||= Set.new %w(
          any boolean byte currency date decimal double integer long
          longlong longptr object single string variant
        )
      end

      def self.operator_words
        @operator_words ||= Set.new %w(
          addressof and andalso as eqv imp is isnot like
          mod not or orelse typeof xor
        )
      end

      def self.builtins
        @builtins ||= Set.new %w(
          debug err
        )
      end

      id = /[a-z_]\w*/i

      state :whitespace do
        rule %r/_[ \t]*\n/, Keyword
        rule %r/\n/, Text, :bol
        rule %r/[^\S\n]+/, Text
        rule %r/rem\b.*?$/i, Comment::Single
        rule %r(/\*.*?\*/)m, Comment::Multiline
        rule %r/'.*$/, Comment::Single
      end

      state :bol do
        rule %r/[^\S\n]+/, Text
        rule(//) { pop! }
      end

      state :root do
        mixin :whitespace
        rule %r(
            [#]If\b .*? \bThen
          | [#]ElseIf\b .*? \bThen
          | [#]Else\b
          | [#]End \s+ If
          | [#]Const
          | [#]Region .*? \n
          | [#]End \s+ Region
        )xi, Comment::Preproc

        rule %r/\[/, Punctuation, :attribute

        rule %r/(\d+\.\d*|\d*\.\d+)(e[+-]?\d+)?[!#@]?/i, Num::Float
        rule %r/\d+e[+-]?\d+[!#@]?/i, Num::Float
        rule %r/&H[0-9a-f]+(_[0-9a-f]+)*[%&!#@]?/i, Num::Integer
        rule %r/&O[0-7]+(_[0-7]+)*[%&!#@]?/i, Num::Integer
        rule %r/&B[01]+(_[01]+)*[%&!#@]?/i, Num::Integer
        rule %r/\d+[%&!#@]?/, Num::Integer

        rule %r/[.]/, Punctuation, :dotted
        rule %r/[(){}!#,;:]/, Punctuation

        rule %r/Option\s+(Strict|Explicit|Compare|Base)\s+(On|Off|Binary|Text|0|1)/i,
          Keyword::Declaration
        rule %r/Exit[ \t]+(Function|Sub|Property|For|Do|While)\b/i, Keyword
        rule %r/End\b/i, Keyword, :end
        rule %r/(Dim|Const|ReDim)\b/i, Keyword, :dim
        rule %r/(Function|Sub|Property)\b/i, Keyword, :funcname
        rule %r/(Alias|Class|CoClass|Structure|Enum|Type|Interface)\b/i, Keyword, :typename
        rule %r/(Module|Namespace|Imports)\b/i, Keyword, :namespace

        rule %r/#{id}[%&@!#$]/, Name

        rule id do |m|
          key = m[0].downcase
          if self.class.keywords.include? key
            token Keyword
          elsif self.class.keywords_type.include? key
            token Keyword::Type
          elsif self.class.operator_words.include? key
            token Operator::Word
          elsif self.class.builtins.include? key
            token Name::Builtin
          else
            token Name
          end
        end

        rule(
          %r(&=|[*]=|/=|\\=|\^=|\+=|-=|<<=|>>=|<<|>>|:=|<=|>=|<>|[-&*/\\^+=<>]),
          Operator
        )

        rule %r/"/, Str, :string
      end

      state :dotted do
        mixin :whitespace
        rule %r/#{id}[%&@!#$]?/, Name, :pop!
        rule(//) { pop! }
      end

      state :string do
        rule %r/""/, Str::Escape
        rule %r/"/, Str, :pop!
        rule %r/[^"]+/, Str
      end

      state :attribute do
        rule %r/[^\S\n]+/, Text
        rule %r/\]/, Punctuation, :pop!
        rule %r/,/, Punctuation
        rule %r/\(/, Punctuation, :attrargs
        rule id, Name::Attribute
        rule(//) { pop! }
      end

      state :attrargs do
        rule %r/[^\S\n]+/, Text
        rule %r/\)/, Punctuation, :pop!
        rule %r/,/, Punctuation
        rule %r/"/, Str, :string
        rule %r/(\d+\.\d*|\d*\.\d+)(e[+-]?\d+)?[!#@]?/i, Num::Float
        rule %r/&H[0-9a-f]+(_[0-9a-f]+)*[%&!#@]?/i, Num::Integer
        rule %r/&O[0-7]+(_[0-7]+)*[%&!#@]?/i, Num::Integer
        rule %r/&B[01]+(_[01]+)*[%&!#@]?/i, Num::Integer
        rule %r/\d+[%&!#@]?/, Num::Integer
        rule id do |m|
          key = m[0].downcase
          if self.class.keywords.include? key
            token Keyword
          elsif self.class.keywords_type.include? key
            token Keyword::Type
          else
            token Name
          end
        end
        rule(//) { pop! }
      end

      state :dim do
        mixin :whitespace
        rule %r/#{id}[%&@!#$]?/, Name::Variable, :pop!
        rule(//) { pop! }
      end

      state :funcname do
        mixin :whitespace
        rule %r/#{id}[%&@!#$]?/, Name::Function, :pop!
        rule(//) { pop! }
      end

      state :typename do
        mixin :whitespace
        rule id do |m|
          token Name::Class
          goto :typename_ext
        end
        rule(//) { pop! }
      end

      state :typename_ext do
        mixin :whitespace
        rule %r/(Extends|As)\b/i do |m|
          token Keyword
          goto :typename
        end
        rule(//) { pop! }
      end

      state :namespace do
        mixin :whitespace
        rule %r/#{id}([.]#{id})*/, Name::Namespace, :pop!
        rule(//) { pop! }
      end

      state :end do
        mixin :whitespace
        rule %r/(Function|Sub|Property|Class|CoClass|Structure|Enum|Module|Namespace|Type|Interface|Select|If|With)\b/i,
          Keyword, :pop!
        rule(//) { pop! }
      end
    end
  end
end
