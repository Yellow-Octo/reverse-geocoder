/**
 * This file is the entrypoint of browser builds.
 * The code executes when loaded in a browser.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
import {ReverseGeocoder} from "./main";

(window as any).ReverseGeocoder = ReverseGeocoder  // instead of casting window to any, you can extend the Window interface: https://stackoverflow.com/a/43513740/5433572

