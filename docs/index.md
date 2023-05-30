# Work in progress...
Check back soon. The site is under active construction, please don't enter without a hard hat.

<h2>Table of Contents</h2>

{% assign mydocs = site.samples | group_by: 'category' %}
{% for cat in mydocs %}
{% assign catdata = site.data.meta.categories | where:"category", cat.name | first %}
{% if catdata %}
<h3>{{ catdata.title  }}</h3>
<p>{{ catdata.description }}</p>
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

<ul>
{% assign mydocs = site.samples | group_by: 'category' %}
{% for cat in mydocs %}
<li>
{% assign catdata = site.data.meta.categories | where:"category", cat.name | first %}
 <details>
{% if catdata %}
  <summary>{{ catdata.title }}
   <p>{{ catdata.description }}</p>
  </summary>
{% else %}
  <summary>{{ cat.name }}</summary>
{% endif %}
{% assign items = cat.items | sort: 'order' %}
  <ul>
{% for item in items %}
   <li>
   <details>
   <summary><a href="{{ item.url }}">{{ item.title }}</a></summary>
   </details>
   </li>
{% endfor %}
  </ul>
 </details>
</li>
{% endfor %}
</ul>