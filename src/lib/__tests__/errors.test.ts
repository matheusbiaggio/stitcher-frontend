import axios from 'axios'
import { describe, it, expect } from 'vitest'

import { extractApiError } from '../errors'

describe('extractApiError', () => {
  it('returns message from axios error response', () => {
    const err = new axios.AxiosError('request failed', 'ERR_BAD_RESPONSE')
    err.response = {
      data: { message: 'CPF já cadastrado' },
      status: 409,
      statusText: 'Conflict',
      headers: {},
      config: {} as never,
    }
    expect(extractApiError(err)).toBe('CPF já cadastrado')
  })

  it('returns fallback when axios error has no response data', () => {
    const err = new axios.AxiosError('network error', 'ERR_NETWORK')
    expect(extractApiError(err, 'Falha de rede')).toBe('Falha de rede')
  })

  it('returns fallback for non-axios errors', () => {
    expect(extractApiError(new Error('something'), 'Erro desconhecido')).toBe('Erro desconhecido')
  })

  it('uses default fallback when none provided', () => {
    expect(extractApiError(new Error('x'))).toBe('Algo deu errado')
  })
})
