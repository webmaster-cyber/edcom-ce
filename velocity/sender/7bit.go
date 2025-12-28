package sender

func blocks(n, block int) int {
	if n%block == 0 {
		return n / block
	}
	return n/block + 1
}

func pack7Bit(raw7 []byte) []byte {
	pack7 := make([]byte, blocks(len(raw7)*7, 8))
	pack := func(out []byte, b byte, oct int, bit uint8) (int, uint8) {
		for i := uint8(0); i < 7; i++ {
			out[oct] |= b >> i & 1 << bit
			bit++
			if bit == 8 {
				oct++
				bit = 0
			}
		}
		return oct, bit
	}
	var oct int   // current octet in pack7
	var bit uint8 // current bit in octet
	var b byte    // current byte in raw7
	for i := range raw7 {
		b = raw7[i]
		oct, bit = pack(pack7, b, oct, bit)
	}
	return pack7
}

func unpack7Bit(pack7 []byte) []byte {
	raw7 := make([]byte, 0, len(pack7))
	var sep byte  // current septet
	var bit uint8 // current bit in septet
	for _, oct := range pack7 {
		for i := uint8(0); i < 8; i++ {
			sep |= oct >> i & 1 << bit
			bit++
			if bit == 7 {
				raw7 = append(raw7, sep)
				sep = 0
				bit = 0
			}
		}
	}
	if len(raw7) > 0 && raw7[len(raw7)-1] == 0 {
		raw7 = raw7[:len(raw7)-1]
	}
	return raw7
}
