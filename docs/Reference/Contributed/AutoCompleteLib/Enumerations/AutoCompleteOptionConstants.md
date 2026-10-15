---
title: AutoCompleteOptionConstants
parent: Enumerations
grand_parent: AutoCompleteLib Package
permalink: /tB/Packages/Contributed/AutoCompleteLib/Enumerations/AutoCompleteOptionConstants
---

# AutoCompleteOptionConstants enumeration
{: .no_toc }

Selects how the completion behaves while the user types into the text box.

The enumeration is declared inside the [**AutoComplete**](../AutoComplete) class. The values are flags that can be combined with `Or`; each is the value of the Windows `ACO_*` option of the same meaning. The members are used without a qualifier, or with the name of the enumeration.

| Member | Value | Description |
|:-------|:------|:------------|
| **AutoCompleteOptionNone**{: #AutoCompleteOptionNone } | `&H0` | No option is set. The completion neither shows a list nor appends text. |
| **AutoCompleteOptionAppend**{: #AutoCompleteOptionAppend } | `&H2` | Appends the best match to the typed text and selects the appended part. |
| **AutoCompleteOptionSuggest**{: #AutoCompleteOptionSuggest } | `&H1` | Shows a drop-down list of the matching suggestions. |
| **AutoCompleteOptionSuggestAppend**{: #AutoCompleteOptionSuggestAppend } | `&H3` | Both **AutoCompleteOptionSuggest** and **AutoCompleteOptionAppend**: the member is defined as the two combined with `Or`. |
| **AutoCompleteOptionSearch**{: #AutoCompleteOptionSearch } | `&H4` | Adds a search item at the bottom of the drop-down list. |
| **AutoCompleteOptionFilterPrefixes**{: #AutoCompleteOptionFilterPrefixes } | `&H8` | Ignores common prefixes such as `www.` and `http://` when matching the typed text. |
| **AutoCompleteOptionUseTab**{: #AutoCompleteOptionUseTab } | `&H10` | The **Tab** key selects the highlighted suggestion. |
| **AutoCompleteOptionUpDownKeyDropsList**{: #AutoCompleteOptionUpDownKeyDropsList } | `&H20` | The **Up** and **Down** arrow keys open the drop-down list. |
| **AutoCompleteOptionRightToLeft**{: #AutoCompleteOptionRightToLeft } | `&H40` | Shows the text of the drop-down list in right-to-left reading order. |

## Used by

- [**AutoComplete**](../AutoComplete) class: [**Options**](../AutoComplete#options)

## See Also

- [Enumerations](.) -- all the enumerations of the package
- [AutoComplete](../AutoComplete) class
