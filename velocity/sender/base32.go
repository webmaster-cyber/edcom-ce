package sender

import (
	"fmt"
	"math/big"
)

type Alphabet struct {
	decode [128]int8
	encode [32]byte
}

func NewAlphabet(s string) *Alphabet {
	ret := new(Alphabet)
	copy(ret.encode[:], s)
	for i := range ret.decode {
		ret.decode[i] = -1
	}
	for i, b := range ret.encode {
		ret.decode[b] = int8(i)
	}
	return ret
}

var alphabet = NewAlphabet("abcdefghijkmnpqrstuvwxyz23456789")

var bn0 = big.NewInt(0)
var bn32 = big.NewInt(32)

func Base32Encode(a []byte) string {
	zero := alphabet.encode[0]
	idx := len(a)*162/100 + 1
	buf := make([]byte, idx)
	bn := new(big.Int).SetBytes(a)
	var mo *big.Int
	for bn.Cmp(bn0) != 0 {
		bn, mo = bn.DivMod(bn, bn32, new(big.Int))
		idx--
		buf[idx] = alphabet.encode[mo.Int64()]
	}
	for i := range a {
		if a[i] != 0 {
			break
		}
		idx--
		buf[idx] = zero
	}
	return string(buf[idx:])
}

func Base32Decode(str string) ([]byte, error) {
	zero := alphabet.encode[0]

	var zcount int
	for i := 0; i < len(str) && str[i] == zero; i++ {
		zcount++
	}
	leading := make([]byte, zcount)

	var padChar rune = -1
	src := []byte(str)
	j := 0
	for ; j < len(src) && src[j] == byte(padChar); j++ {
	}

	n := new(big.Int)
	for i := range src[j:] {
		if int(src[i]) >= len(alphabet.decode) {
			return nil, fmt.Errorf("illegal base32 data at input index: %d", i)
		}
		c := alphabet.decode[src[i]]
		if c == -1 {
			return nil, fmt.Errorf("illegal base32 data at input index: %d", i)
		}
		n.Mul(n, bn32)
		n.Add(n, big.NewInt(int64(c)))
	}
	return append(leading, n.Bytes()...), nil
}
