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
            if !File.exists?(File.join(imgpath, imgfile))
              txtfile = File.join(imgpath, "#{name}.#{@ext}")
              img = File.join(imgpath, imgfile)
              if File.exists?(img)
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

require 'block/plantuml-block'
require 'block/mermaid-block'
require 'block/mathjax-block'
require 'block/bpmn-block'
require 'block/raw-block'

