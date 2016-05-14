# CenturyLink Cloud Price Estimator

A simple calculator for estimating monthly cost of using CenturyLink Cloud products and services.
A built version of this tool is viewable here:

https://www.ctl.io/estimator

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

To update prices (each data center the service is offered), edit the pricing JSON files in
`CenturyLinkCloud/PriceEstimator/public/prices` and `CenturyLinkCloud/PublicPlatform/public/prices`

There are multiple pricing JSON files: `baseline.json`, one for each data center (e.g., `gb3.json`, and `default.json`. The `default.json` file is used if there is not a file for a particular data center.

Pricing changes must be made to all of these files in both repositories.

The file [data-center-prices.json](https://github.com/CenturyLinkCloud/PriceEstimator/blob/master/public/prices/data-center-prices.json) feeds the select dropdown for the data centers as well as specifies which pricing JSON file to use.

To update Managed Services, edit: https://github.com/CenturyLinkCloud/PriceEstimator/blob/master/source/js/app/templates/addManagedApp.haml

## Build

- To compile front-end assets run `grunt`. This may be unecessary if you've been running `grunt dev`; `grunt` does the same stuff without the watching.
- Run `middleman build` to output compiled HTML, CSS, JS to the `build` directory
- Deploy the contents of the *build* directory.

## Assumptions for Calculations

- 720 hours in a month
- 30.42 days in a month
- 4.35 weeks in a month

## Credits

- Designed by Nathan Young at CenturyLink Cloud / nathan.young@ctl.io
- Developed by Matt Fordham at WINTR / matt@wintr.us

