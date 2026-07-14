'use strict'

const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const { describe, it } = require('node:test')

const packageJson = require('../package.json')
const packageLock = require('../package-lock.json')

const EXACT_VERSION = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/
const SHA512_INTEGRITY = /^sha512-[A-Za-z0-9+/]+={0,2}$/
const IMMUTABLE_ACTION = /^[^\s@]+@[0-9a-f]{40}$/
const DEPENDENCY_SECTIONS = [
  'dependencies',
  'devDependencies',
  'optionalDependencies',
  'peerDependencies',
]

describe('dependency pinning policy', () => {
  it('pins every npm dependency to an exact version and SHA-512 integrity', () => {
    for (const section of DEPENDENCY_SECTIONS) {
      for (const [name, version] of Object.entries(packageJson[section] || {})) {
        assert.match(version, EXACT_VERSION, `${section}.${name} must be exact`)
        assert.equal(packageLock.packages[''][section][name], version)

        const lockedPackage = packageLock.packages[`node_modules/${name}`]
        assert.ok(lockedPackage, `${name} must exist in package-lock.json`)
        assert.equal(lockedPackage.version, version)
        assert.match(
          lockedPackage.integrity,
          SHA512_INTEGRITY,
          `${name} must have SHA-512 integrity`
        )
      }
    }

    for (const [location, lockedPackage] of Object.entries(
      packageLock.packages
    )) {
      if (location === '') {
        continue
      }

      assert.match(
        lockedPackage.version,
        EXACT_VERSION,
        `${location} must have an exact version`
      )
      assert.match(
        lockedPackage.integrity,
        SHA512_INTEGRITY,
        `${location} must have SHA-512 integrity`
      )
      assert.match(
        lockedPackage.resolved,
        /^https:\/\/registry\.npmjs\.org\//,
        `${location} must resolve from the npm registry`
      )
    }
  })

  it('pins every GitHub Action to a full commit SHA', () => {
    const workflowsDirectory = path.join(__dirname, '..', '.github', 'workflows')
    const workflowFiles = fs
      .readdirSync(workflowsDirectory)
      .filter(file => /\.ya?ml$/.test(file))

    for (const workflowFile of workflowFiles) {
      const workflow = fs.readFileSync(
        path.join(workflowsDirectory, workflowFile),
        'utf8'
      )
      const actions = [
        ...workflow.matchAll(/^\s*(?:-\s*)?uses:\s*([^\s#]+)/gm),
      ]

      assert.ok(actions.length > 0, `${workflowFile} must declare an action`)
      for (const [, action] of actions) {
        assert.match(
          action,
          IMMUTABLE_ACTION,
          `${workflowFile} action must use a full commit SHA`
        )
      }
    }
  })

  it('pins the CI runner and Node.js patch versions', () => {
    const workflow = fs.readFileSync(
      path.join(__dirname, '..', '.github', 'workflows', 'ci.yml'),
      'utf8'
    )

    assert.doesNotMatch(workflow, /runs-on:\s*\S*latest/)
    assert.match(workflow, /runs-on:\s*ubuntu-\d{2}\.\d{2}/)

    const matrix = workflow.match(/node-version:\s*\[([^\]]+)\]/)
    assert.ok(matrix, 'CI must declare a Node.js version matrix')

    const versions = matrix[1]
      .split(',')
      .map(version => version.trim().replace(/^['"]|['"]$/g, ''))

    assert.ok(versions.length > 0)
    for (const version of versions) {
      assert.match(version, EXACT_VERSION, 'Node.js versions must include a patch')
    }
  })

  it('pins and verifies the OSV-Scanner binary by SHA-256', () => {
    const workflow = fs.readFileSync(
      path.join(__dirname, '..', '.github', 'workflows', 'ci.yml'),
      'utf8'
    )

    assert.match(workflow, /OSV_SCANNER_VERSION:\s*v\d+\.\d+\.\d+/)
    assert.match(workflow, /OSV_SCANNER_SHA256:\s*[0-9a-f]{64}/)
    assert.match(workflow, /sha256sum --check --strict/)
  })
})
