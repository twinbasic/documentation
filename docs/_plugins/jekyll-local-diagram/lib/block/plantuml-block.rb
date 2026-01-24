module JekyllLocalDiagram
  class PlantumlBlock < JekyllLocalDiagram::JekyllLocalDiagramBlock
    def initialize(tag_name, markup, tokens)
      super
      @ext = 'uml'
      @blockclass = 'plantuml'
      @jarpath = File.join(File.expand_path(File.join(File.dirname(__FILE__), '../..')), '/ext/plantuml.jar')
    end

    def build_cmd(input, output)
      "java -jar #{@jarpath} -tsvg -o #{File.dirname(output)} #{input}"
    end
  end
end

Liquid::Template.register_tag('plantuml', JekyllLocalDiagram::PlantumlBlock)
