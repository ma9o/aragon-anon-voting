import { decToHex } from 'hex2dec'

function cAllocateKeypairs(keyPairs) {
  let keyLen = 78

  let data = new Uint8Array(keyPairs.length * 2 * keyLen)
  let last = 0
  for (let i = 0; i < keyPairs.length; i++) {
    for (let j = 0; j < keyPairs[i].length; j++) {
      for (var k = 0; k < last + keyPairs[i][j].length; k++) {
        let c = keyPairs[i][j].charCodeAt(k)
        if (!isNaN(c)) {
          data[k + last] = c
        } else {
          data[k + last] = 0
        }
      }
      if (!(data[k + last - 1] === 0)) {
        data[k + last] = 0
      }
      last += keyLen
    }
  }

  let dataPtr = window.Module._malloc(data.length)
  let dataHeap = new Uint8Array(
    window.Module.HEAPU8.buffer,
    dataPtr,
    data.length
  )
  dataHeap.set(new Uint8Array(data.buffer))

  let pointers = new Uint32Array(keyPairs.length * 2)
  for (let i = 0; i < pointers.length; i++) {
    pointers[i] = dataPtr + i * keyLen
  }

  let pointerPtr = window.Module._malloc(pointers.length * 4)
  let pointerHeap = new Uint8Array(
    window.Module.HEAPU8.buffer,
    pointerPtr,
    pointers.length * 4
  )
  pointerHeap.set(new Uint8Array(pointers.buffer))

  let ret = {
    ptrOffset: pointerHeap.byteOffset,
    dataOffset: dataHeap.byteOffset,
  }

  return ret
}

function padHexToDec(data, opt = null) {
  let ret = decToHex(data, opt)
  if (ret.length === 63 + 2) {
    ret = '0x0' + ret.slice(2)
  }
  if (ret.length === 63) {
    ret = '0' + ret
  }
  return ret
}

export function sign(msg, pub, priv, fake, keyPairs) {
  let alloc = cAllocateKeypairs(keyPairs)
  let res = window.Module.ccall(
    'sign',
    'string',
    ['string', 'string', 'string', 'string', 'number', 'number'],
    [msg, pub, priv, fake, alloc.ptrOffset, keyPairs.length]
  )
  window.Module._free(alloc.ptrOffset)
  window.Module._free(alloc.dataOffset)

  let sigObj = JSON.parse(res)

  let opt = { prefix: false }
  let ret = padHexToDec(sigObj.tag[0]) + padHexToDec(sigObj.tag[1], opt)
  for (let i = 0; i < sigObj.tees.length; i++) {
    ret += padHexToDec(sigObj.tees[i], opt)
  }
  ret += padHexToDec(sigObj.seed, opt)

  return ret
}

export function genID() {
  let res = window.Module.ccall('genID', 'string')
  return JSON.parse(res)
}
