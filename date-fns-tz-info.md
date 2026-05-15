Starting from v4, date-fns has first-class support for time zones. It is provided via @date-fns/tz and @date-fns/utc packages. Visit the links to learn more about corresponding packages.

Just like with everything else in date-fns, the time zones support has a minimal bundle size footprint with UTCDateMini and TZDateMini being 239 B and 761 B, respectively.

If you're looking for time zone support prior to date-fns v4, see the third-party date-fns-tz package.

See the announcement blog post for details about the motivation and implementation and the change log entry for the list of changes in v4.0.

Working with time zones
There are two ways to start working with time zones:

Using the Date extensions TZDate and UTCDate

Using the date-fns functions' in option

Using TZDate & UTCDate
One way is to use TZDate or UTCDate Date extensions,with regular date-fns functions:

import { TZDate } from "@date-fns/tz";
import { addHours } from "date-fns";

// Given that the system time zone is America/Los_Angeles
// where DST happens on Sunday, 13 March 2022, 02:00:00

// Using the system time zone will produce 03:00 instead of 02:00 because of DST:
const date = new Date(2022, 2, 13);
addHours(date, 2).toString();
//=> 'Sun Mar 13 2022 03:00:00 GMT-0700 (Pacific Daylight Time)'

// Using Asia/Singapore will provide the expected 02:00:
const tzDate = new TZDate(2022, 2, 13, "Asia/Singapore");
addHours(tzDate, 2).toString();
//=> 'Sun Mar 13 2022 02:00:00 GMT+0800 (Singapore Standard Time)'
You can safely mix and match regular Date instances, as well as UTCDate or TZDate in different time zones and primitive values (timestamps and strings). date-fns will normalize the arguments, taking the first object argument (Date or a Date extension instance) as the reference and return the result in the reference type:

import { TZDate } from "@date-fns/tz";
import { differenceInBusinessDays } from "date-fns";

const laterDate = new TZDate(2025, 0, 1, "Asia/Singapore");
const earlierDate = new TZDate(2024, 0, 1, "America/New_York");

// Will calculate in Asia/Singapore
differenceInBusinessDays(laterDate, earlierDate);
//=> 262

// Will calculate in America/New_York
differenceInBusinessDays(earlierDate, laterDate);
//=> -261
In the given example, the one-day difference comes from the fact that in New York (UTC-5), the earlierDate will be Dec 31 rather than Jan 1:

laterDate.withTimeZone("Asia/Singapore").toString();
//=> 'Wed Jan 01 2025 00:00:00 GMT+0800 (Singapore Standard Time)'
earlierDate.withTimeZone("Asia/Singapore").toString();
//=> 'Mon Jan 01 2024 13:00:00 GMT+0800 (Singapore Standard Time)'

laterDate.withTimeZone("America/New_York").toString();
//=> 'Tue Dec 31 2024 11:00:00 GMT-0500 (Eastern Standard Time)'
earlierDate.withTimeZone("America/New_York").toString();
//=> 'Mon Jan 01 2024 00:00:00 GMT-0500 (Eastern Standard Time)'
This is essential to understand and consider when making calculations.

Using in option
When it is important to get the value in a specific time zone or when you are unsure about the type of arguments, use the function context in option.

Each function, where the calculation might be affected by the time zone, like with differenceInBusinessDays, accepts the in option that provides the context for the arguments and the result, so you can explicitly say what time zone to use:

import { tz } from "@date-fns/tz";

// Will calculate in Asia/Singapore
differenceInBusinessDays(laterDate, earlierDate);
//=> 262

// Will normalize to America/Los_Angeles
differenceInBusinessDays(laterDate, earlierDate, {
  in: tz("America/Los_Angeles"),
});
//=> 261
In the example, we forced differenceInBusinessDays to use the Los Angeles time zone.



@date-fns/tz docs
Usage
TZDate and TZDateMini have API similar to Date, but perform all calculations in the given time zone, which might be essential when operating across different time zones, calculating dates for users in different regions, or rendering chart or calendar component:

import { TZDate } from "@date-fns/tz";
import { addHours } from "date-fns";

// Given that the system time zone is America/Los_Angeles
// where DST happens at Sunday, 13 March 2022, 02:00:00

// Using system time zone will produce 03:00 instead of 02:00 because of DST:
const date = new Date(2022, 2, 13);
addHours(date, 2).toString();
//=> 'Sun Mar 13 2022 03:00:00 GMT-0700 (Pacific Daylight Time)'

// Using Asia/Singapore will provide expected 02:00:
const tzDate = new TZDate(2022, 2, 13, "Asia/Singapore");
addHours(tzDate, 2).toString();
//=> 'Sun Mar 13 2022 02:00:00 GMT+0800 (Singapore Standard Time)'
Accepted time zone formats
You can pass IANA time zone name ("Asia/Singapore", "America/New_York", etc.) or UTC offset ("+01:00", "-2359", or "+23"):

new TZDate(2022, 2, 13, "Asia/Singapore");

new TZDate(2022, 2, 13, "+08:00");

new TZDate(2022, 2, 13, "-2359");

TZDate
All the TZDate docs are also true for TZDateMini.

Constructor
When creating TZDate, you can pass the time zone as the last argument:

new TZDate(2022, 2, "Asia/Singapore");

new TZDate(timestamp, "Asia/Singapore");

new TZDate("2024-09-12T00:00:00Z", "Asia/Singapore");
The constructor mirrors the original Date parameters except for the last time zone parameter.

TZDate.tz
The static tz function allows to construct TZDate instance with just a time zone:

// Create now in Singapore time zone:
TZDate.tz("Asia/Singapore");

// ❌ This will not work, as TZDate expects a date string:
new TZDate("Asia/Singapore");
//=> Invalid Date
Just like the constructor, the function accepts all parameters variants:

TZDate.tz("Asia/Singapore", 2022, 2);

TZDate.tz("Asia/Singapore", timestamp);

TZDate.tz("Asia/Singapore", "2024-09-12T00:00:00Z");
timeZone
The readonly timeZone property returns the time zone name assigned to the instance:

new TZDate(2022, 2, 13, "Asia/Singapore").timeZone;
// "Asia/Singapore"
The property might be undefined when created without a time zone:

new TZDate().timeZone;
// undefined
withTimeZone
The withTimeZone method allows to create a new TZDate instance with a different time zone:

const sg = new TZDate(2022, 2, 13, "Asia/Singapore");
const ny = sg.withTimeZone("America/New_York");

sg.toString();
//=> 'Sun Mar 13 2022 00:00:00 GMT+0800 (Singapore Standard Time)'

ny.toString();
//=> 'Sat Mar 12 2022 11:00:00 GMT-0500 (Eastern Standard Time)'
[Symbol.for("constructDateFrom")]
The TZDate instance also exposes a method to construct a Date instance in the same time zone:

const sg = TZDate.tz("Asia/Singapore");

// Given that the system time zone is America/Los_Angeles

const date = sg[Symbol.for("constructDateFrom")](new Date(2024, 0, 1));

date.toString();
//=> 'Mon Jan 01 2024 16:00:00 GMT+0800 (Singapore Standard Time)'
It's created for date-fns but can be used in any context. You can access it via Symbol.for("constructDateFrom") or import it from the package:

import { constructFromSymbol } from "@date-fns/tz";
tz
The tz function allows to specify the context for the [date-fns] functions (starting from date-fns@4):

import { isSameDay } from "date-fns";
import { tz } from "@date-fns/tz";

isSameDay("2024-09-09T23:00:00-04:00", "2024-09-10T10:00:00+08:00", {
  in: tz("Europe/Prague"),
});
//=> true
tzOffset
The tzOffset function allows to get the time zone UTC offset in minutes from the given time zone and a date:

import { tzOffset } from "@date-fns/tz";

const date = new Date("2020-01-15T00:00:00Z");

tzOffset("Asia/Singapore", date);
//=> 480

tzOffset("America/New_York", date);
//=> -300

// Summer time:
tzOffset("America/New_York", "2020-01-15T00:00:00Z");
//=> -240
Unlike Date.prototype.getTimezoneOffset, this function returns the value mirrored to the sign of the offset in the time zone. For Asia/Singapore (UTC+8), tzOffset returns 480, while getTimezoneOffset returns -480.