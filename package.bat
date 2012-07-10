@echo off
set zip="D:\Program Files\7-zip\7z.exe"

%zip% a package.zip _locales icon js manifest.json *.html
