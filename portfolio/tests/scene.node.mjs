// A real Node test runner for offline geometry/motion checks. Does not replace Vitest.
import { test } from 'node:test'
import { registerSceneCases } from './scene-cases.js'

registerSceneCases(test)
