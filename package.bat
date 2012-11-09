@echo off
set zip="D:\Program Files\7-zip\7z.exe"

%zip% a package.zip _locales css icon js manifest.json blank_sample.zip *.html
