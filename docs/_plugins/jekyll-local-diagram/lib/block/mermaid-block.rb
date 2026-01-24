module JekyllLocalDiagram
  class MermaidBlock < JekyllLocalDiagram::JekyllLocalDiagramBlock
    def initialize(tag_name, markup, tokens)
      super
      @ext = 'mmd'
      @blockclass = 'mermaid'
      @puppetercfg = File.join(File.expand_path(File.join(File.dirname(__FILE__), '../..')), '/cfg/puppeteer.json')
    end

    def build_cmd(input, output)
      "mmdc -i #{input} -o #{output} -p #{@puppetercfg}"
    end
  end
end

Liquid::Template.register_tag('mermaid', JekyllLocalDiagram::MermaidBlock)
