module JekyllLocalDiagram
    class BpmnBlock < JekyllLocalDiagramBlock
      def initialize(tag_name, markup, tokens)
        super
        @ext = 'bpmn'
        @blockclass = 'bpmn'
      end
  
      def build_cmd(input, output)
        "bpmn-to-image #{input}:#{output}"
      end
    end
end
  
Liquid::Template.register_tag('bpmn', JekyllLocalDiagram::BpmnBlock)
