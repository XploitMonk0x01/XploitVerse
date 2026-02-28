FROM ubuntu:22.04

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 openssl xxd bsdmainutils \
    nano less curl file \
    && rm -rf /var/lib/apt/lists/*

RUN useradd -m -s /bin/bash hacker && echo "hacker:hacker123" | chpasswd

WORKDIR /home/hacker/challenges

# ---------- Challenge 1: Base64 ----------
RUN echo "RkxBR3t4dl9jcnlwdG9fYmFzZTY0X2RlY29kZWR9" > /home/hacker/challenges/01_base64.txt && \
    echo "# Challenge 1: Decode this Base64 string to find the flag" > /home/hacker/challenges/01_README.txt

# ---------- Challenge 2: Hex encoding ----------
RUN echo "464c41477b78765f63727970746f5f6865785f656e636f64696e677d" > /home/hacker/challenges/02_hex.txt && \
    echo "# Challenge 2: This is a hex-encoded flag. Decode it." > /home/hacker/challenges/02_README.txt

# ---------- Challenge 3: ROT13 ----------
RUN echo "SYNT{ki_pelcgb_ebg13_pynffvp}" > /home/hacker/challenges/03_rot13.txt && \
    echo "# Challenge 3: Classic Caesar cipher with rotation 13" > /home/hacker/challenges/03_README.txt

# ---------- Challenge 4: Binary ----------
RUN echo "01000110 01001100 01000001 01000111 01111011 01111000 01110110 01011111 01100011 01110010 01111001 01110000 01110100 01101111 01011111 01100010 01101001 01101110 01100001 01110010 01111001 01011111 01100100 01100101 01100011 01101111 01100100 01100101 01111101" > /home/hacker/challenges/04_binary.txt && \
    echo "# Challenge 4: Binary-encoded flag. Convert binary to ASCII." > /home/hacker/challenges/04_README.txt

# ---------- Challenge 5: Hash cracking ----------
RUN echo "Hash: 5f4dcc3b5aa765d61d8327deb882cf99" > /home/hacker/challenges/05_hash.txt && \
    echo "# Challenge 5: This is an MD5 hash of a common password." >> /home/hacker/challenges/05_hash.txt && \
    echo "# Once you crack it, the flag is FLAG{xv_crypto_hash_cracked_<password>}" >> /home/hacker/challenges/05_hash.txt && \
    echo "# Hint: It's one of the most common passwords in the world." > /home/hacker/challenges/05_README.txt

# ---------- Challenge 6: XOR cipher ----------
RUN python3 -c "
key = 0x42
plaintext = 'FLAG{xv_crypto_xor_decrypted}'
encrypted = ' '.join(format(ord(c) ^ key, '02x') for c in plaintext)
print(f'Encrypted (XOR key=0x42): {encrypted}')
" > /home/hacker/challenges/06_xor.txt && \
    echo "# Challenge 6: XOR encrypted with a single-byte key 0x42" > /home/hacker/challenges/06_README.txt

# ---------- Challenge 7: JWT token ----------
RUN echo "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyIjoiYWRtaW4iLCJmbGFnIjoiRkxBR3t4dl9jcnlwdG9fand0X2RlY29kZWR9Iiwicm9sZSI6ImFkbWluIn0.invalid_signature" > /home/hacker/challenges/07_jwt.txt && \
    echo "# Challenge 7: Decode this JWT token (don't verify, just read the payload)" > /home/hacker/challenges/07_README.txt

RUN chown -R hacker:hacker /home/hacker/challenges

USER hacker
WORKDIR /home/hacker
CMD ["sleep", "infinity"]
