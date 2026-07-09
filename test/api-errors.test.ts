import { describe, expect, it } from 'vitest'
import {
  COLLECTIVES_WRITE_AUTH_ERROR_CODE,
  isCollectivesWriteAuthError,
  readOcsStatusCode,
} from '../shared/api-errors'

describe('readOcsStatusCode', () => {
  it('reads a top-level OCS status code', () => {
    expect(readOcsStatusCode({
      ocs: {
        meta: {
          statuscode: 996,
        },
      },
    })).toBe(996)
  })

  it('reads an OCS status code nested in an h3 error payload', () => {
    expect(readOcsStatusCode({
      statusCode: 500,
      statusMessage: 'Internal Server Error',
      data: {
        ocs: {
          meta: {
            statuscode: 996,
          },
        },
      },
    })).toBe(996)
  })

  it('reads the collectives write auth error code', () => {
    expect(readOcsStatusCode({
      code: COLLECTIVES_WRITE_AUTH_ERROR_CODE,
    })).toBe(996)
  })
})

describe('isCollectivesWriteAuthError', () => {
  it('detects the nested client error shape for collectives write failures', () => {
    expect(isCollectivesWriteAuthError({
      statusCode: 500,
      statusMessage: 'Internal Server Error',
      data: {
        statusCode: 500,
        statusMessage: 'Internal Server Error',
        data: {
          ocs: {
            meta: {
              statuscode: 996,
            },
          },
        },
      },
    })).toBe(true)
  })

  it('ignores unrelated 500 errors', () => {
    expect(isCollectivesWriteAuthError({
      statusCode: 500,
      data: {
        message: 'Something else failed',
      },
    })).toBe(false)
  })
})
