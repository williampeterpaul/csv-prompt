#!/usr/bin/env bun
import { parse } from "./cli";
import { run } from "./process";

await run(await parse());
