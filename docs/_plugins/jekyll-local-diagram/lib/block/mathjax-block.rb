module JekyllLocalDiagram
  class MathJaxBlock < JekyllLocalDiagramBlock
    def initialize(tag_name, markup, tokens)
      super
      @ext = 'tex'
      @blockclass = 'mathjax'
    end

    def build_cmd(input, output)
      "tex2svg \"#{File.read(input)}\"> #{output}"
    end
  end
end

Liquid::Template.register_tag('mathjax', JekyllLocalDiagram::MathJaxBlock)
