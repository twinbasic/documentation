# Work in progress...
Check back soon.

<h2>Table of Contents</h2>
{% assign mydocs = site.samples | group_by: 'category' %}
{% for cat in mydocs %}
<h3>{{ cat.name | capitalize }}</h3>
    <ul>
      {% assign items = cat.items | sort: 'order' %}
      {% for item in items %}
        <li><a href="{{ item.url }}">{{ item.title }}</a></li>
      {% endfor %}
    </ul>
{% endfor %}