# CenturyLink Cloud Price Estimator

A simple calculator for estimating monthly cost of using CenturyLink Cloud products and services.
A built version of this tool is viewable here:

http://www.centurylinkcloud.com/estimator

## Installation

This project uses:

- [Middleman](http://middlemanapp.com/) for compiling a static HTML site from Ruby
- [Grunt](http://gruntjs.com/) for compiling front-end (JS and CSS)

## Project Setup

1. With Ruby 1.9.2+ installed, Run `bundle install` to install Ruby dependencies.
2. With Node installed, run `npm install` to install Node dependencies.

## Development

- Run `middleman server` to run dev server at http://localhost:4567.
- Run `grunt dev` to watch the front-end source files and recompile as necessary.

To update prices, edit :https://github.com/Tier3/Estimator/blob/master/public/json/pricing.json

To update Managed Services, edit: https://github.com/Tier3/Estimator/blob/master/source/js/app/templates/addManagedApp.haml

## Build

- To compile front-end assets run `grunt`. This may be unecessary if you've been running `grunt dev`; `grunt` does the same stuff without the watching. 
- Run `middleman build` to output compiled HTML, CSS, JS to the `build` directory
- Deploy the contents of the *build* directory.

## Assumptions for Calculations

- 730 hours in a month 
- 30.42 days in a month 
- 4.35 weeks in a month

## Credits

- Designed by Nathan Young at CenturyLink Cloud / nathan.young@ctl.io
- Developed by Matt Fordham at WINTR / matt@wintr.us
