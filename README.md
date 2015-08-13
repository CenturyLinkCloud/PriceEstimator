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

To update prices (each data center the service is offered), edit:
https://github.com/CenturyLinkCloud/PriceEstimator/tree/master/public/json/pricing

There are multiple pricing sheets: a default, and then ones for each data center should their prices differ. The file [data-center-prices.json](https://github.com/CenturyLinkCloud/PriceEstimator/blob/master/public/prices/data-center-prices.json) feeds the select dropdown for the data centers as well as specifies which pricing JSON file to use.

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

## Changelog

### April, 10 2015

- Now pulls pricing data from the pricing data at '/public/prices' found in PublicPlatform
- Incorporated exchange rate switching
- Added exchange rates data file to estimator repo
- Added config file ,'/json/data-config.json', to estimator repo which can be used to customize the paths to the data files used in the estimator
  - Paths beginning with "./" point to files relative to the estimator files, i.e. those in /public/static/estimator when in PublicPlatform build
  - Paths beginning with "/" point to files relative to the PublicPlatform root, i.e. "/prices/" points to the prices file the Pricing page uses.
- In order to pull the right data from the pricing sheet, a "key" has been added to products on the pricing sheet where the data is needed in the estimator, e.g. adding "networking-services:dedicated-load-balancer-200" to the product allows it to match up with the corresponding item in the estimator
- Created custom print styles to make estimator print-out more readable/presentable.
- Added asterick and footnote on Load Balancers products to inform the user that estimate to no include setup fees.
- Added Support Cost data file to estimator repo, see '/json/support-pricing.json'
- Added MS SQL Server Standard Addition licensing costs to managed application MS SQL
- MySQL Replication can only be added once there are two or more instances of MySQL added to the estimator.
- Managed applications will now clear out when switching OS selection on managed OS
