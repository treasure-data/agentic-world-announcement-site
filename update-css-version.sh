#!/bin/bash

# Generate a timestamp-based version number
VERSION=$(date +%s)

# Update the CSS version in index.html
sed -i.bak "s/css\/styles\.css?v=[0-9]*/css\/styles.css?v=${VERSION}/" index.html

# Remove the backup file
rm -f index.html.bak

echo "CSS version updated to: ${VERSION}"