# Work in progress...
Check back soon. The site is under active construction, please don't enter without a hard hat.

<h2>Table of Contents</h2>

{% assign mydocs = site.samples | group_by: 'category' %}
{% for cat in mydocs %}
{% assign catdata = site.data.meta.categories | where:"category", cat.name | first %}
{% if catdata %}
<h3>{{ catdata.title  }}</h3>
{% else %}
<h3>{{ cat.name }}</h3>
{% endif %}
<ul>
  {% assign items = cat.items | sort: 'order' %}
  {% for item in items %}
    <li><a href="{{ item.url }}">{{ item.title }}</a></li>
  {% endfor %}
</ul>
{% endfor %}