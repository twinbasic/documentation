# frozen_string_literal: true

require 'liquid'
require 'digest'
require 'fileutils'
require 'logger'

module JekyllLocalDiagram
    class JekyllLocalDiagramBlock < Liquid::Block
        def initialize(tag_name, markup, tokens)
          super
          @html = (markup or '').strip
          @logger = Logger.new(STDOUT)
          @logger.level = Logger::DEBUG
        end
    
        def render(context)
            site = context.registers[:site]
            name = Digest::MD5.hexdigest(super)
            path = File.join('assets', 'images', @ext)
            type = 'svg'
            mimetype = 'svg+xml'
            imgfile = "#{name}.#{type}"
            imgpath = File.join(site.source, path)
            if !File.exist?(File.join(imgpath, imgfile))
              txtfile = File.join(imgpath, "#{name}.#{@ext}")
              img = File.join(imgpath, imgfile)
              if File.exist?(img)
                @logger.debug("File #{imgfile} already exists (#{File.size(img)} bytes)")
              else
                FileUtils.mkdir_p(imgpath)
                File.open(txtfile, 'w') { |f|
                  f.write(super)
                }
                cmd = build_cmd(txtfile, img)
                @logger.debug("Executing #{@blockclass} command: #{cmd}")
                if !system(cmd) 
                  @logger.error("#{@blockclass} error: #{super}")
                else
                  site.static_files << Jekyll::StaticFile.new(
                    site, site.source, path, imgfile
                  )
                  @logger.debug("File #{imgfile} created (#{File.size(img)} bytes)")
                end
              end
            end
            "<p><object data='#{site.baseurl}/#{path}/#{imgfile}' type='image/#{mimetype}' #{@html} class='#{@blockclass}'></object></p>"
        end
    end
end

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

module JekyllLocalDiagram
  class MermaidBlock < JekyllLocalDiagram::JekyllLocalDiagramBlock
    def initialize(tag_name, markup, tokens)
      super
      @ext = 'mmd'
      @blockclass = 'mermaid'
      @puppetercfg = File.join(File.expand_path(File.join(File.dirname(__FILE__), '..')), '/cfg/puppeteer.json')
    end

    def build_cmd(input, output)
      "mmdc -i #{input} -o #{output} -p #{@puppetercfg}"
    end
  end
end

Liquid::Template.register_tag('mermaid', JekyllLocalDiagram::MermaidBlock)

