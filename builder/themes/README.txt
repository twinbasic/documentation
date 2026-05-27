!!! DO NOT MODIFY Dark.theme OR Light.theme

Instead, create your own theme file, e.g. 'MyTheme.theme'

At the top of your theme file, you can use the 'inherits' statement to pull in the theme data from an existing theme, e.g. 'dark' or 'light'.  After that, you add any customized properties underneath.  The provided Dark and Light theme files can be used as a guide as to what properties are available (they contain ALL available properties).

The values for each property are matched to CSS values, so for example a 'TextDecoration' property would match to the 'text-decoration' CSS property, allowing values such as 'underline', 'line-through', and 'none'.  Further documentation will be provided in due course.

For example, the following text uses everything from the 'light' theme, and customizes two properties - you can copy the below into your own .theme file to test it.


inherits:                               light;
SymbolClassTextDecoration:              underline;
MenuBackColor:				red;