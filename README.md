# gulp-replace-tmpl

Replace placeholders in files similar to replacements found in ant projects.

This project was started to have only one place where the version information
is stored for existdb projects built with [@existdb/gulp-exist](https://npmjs.org/).
Though it is recommended to have the version information stored, modified and read from the package.json file in your repository root, you can choose to read the version information from elsewhere, too. 

## Installation

```bash
npm i --save-dev @existdb/gulp-replace-tmpl
```

## Usage

Replace placeholders in files and warn when a replacement is missing.

The placeholders must start and end with an `@`.
If you want to replace `@something@` in a file, your replacements
must have a key `something`. 

If one or more placeholders are not found in your replacements,
a warning will be logged to the console, specifying in which file on which line
the placeholder was found.

The Input and output files are up to you. 

## Options

The exported function has a second parameter that allows you to configure
its behaviour.

* **prefix** (String): default: `"package"`
  Defines a prefix each key must begin with. Only ASCII characters are allowed (`[A-Za-z0-9]+`).
* **unprefixed** (Boolean): default: `false`
  If this is set to true, keys will not be prefixed.
  This setting overrides any value of `prefix`.
* **debug** (Boolean): default: `false`
  Print debug output of the resulting map of replacements before replacments take place.

## example

Start a new project with

```bash
mkdir boaty
cd boaty
npm init -y
npm i --save-dev gulp @existdb/gulp-replace-tmpl
```

Create file .existdb.json

```json
{
    "servers": {
        "localhost": {
            "server": "http://localhost:8080/exist",
            "user": "admin",
            "password": "",
            "root": "/db/apps/boaty"
        }
    },
    "package": {
        "author": "I M Devloper",
        "target": "myapp",
        "description": "My App does X",
        "namespace": "http://my.app/",
        "website": "http://my.app/",
        "status": "beta",
        "title": "The Title of My App"
    }
}
```

A repo.xml.tmpl

```xml
<?xml version="1.0" encoding="UTF-8"?>
<meta xmlns="http://exist-db.org/xquery/repo">
  <description>@package.description@</description>
  <author>@package.author@</author>
  <website>@package.website@</website>
  <status>@package.status@</status>
  <target>@package.target@</target>
  <license>@package.license@</license>
  <copyright>true</copyright>
  <type>application</type>
</meta>
```

and a expath-pkg.xml.tmpl

```xml
<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://expath.org/ns/pkg" 
  name="@package.namespace@"
  abbrev="@package.target@" version="@package.version@" spec="1.0">
  <title>@package.title@</title>
  <!-- <dependency processor="http://exist-db.org" semver-min="4.7.0"/> -->
</package>
```

Finally, we need a gulpfile.js to define a task "templates" that we can call from the command line.

```js
const { src, dest } = require('gulp')
const replace = require('@existdb/gulp-replace-tmpl')

// read only version and license metadata from package.json
const { version, license } = require('package.json')
// read additional metadata from .existdb.json
const packageMetadata = require('.existdb.json').package

// .tmpl replacements to include 
// an array of objects the first definition of a key wins
const replacements = [packageMetadata, {version, license}]

/**
 * replace placeholders in *.ext.tmpl and 
 * output replaced file contents to build/*.ext
 */
function templates() {
    return src('*.tmpl') // search for .tmpl files in project root
        .pipe(replace(replacements)) // replace placeholders
        .pipe(rename(path => { path.extname = "" })) // remove .tmpl extension
        .pipe(dest('build/'))
}

exports.templates = templates
```

With this setup you can now run

```bash
npx gulp templates
```

`repo.xml` and `expath-pkg.xml` should now be in the `build` directory
with the placeholders replaced by the values provided.

## Tests

TODO
