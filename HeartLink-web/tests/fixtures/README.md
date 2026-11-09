# Synthetic media fixture

`syntheticRoutineVideo.js` contains the unmodified 1,746-byte black/white codec test
pattern `blackwhite_yuv420p.webm` from Chromium tag `138.0.7204.188`, encoded as
base64 for the isolated browser test. It is not workout footage or user data.
Tests serve it from intercepted localhost routes; no runtime download is made and
the application bundle does not import it.

- [Pinned source](https://chromium.googlesource.com/chromium/src/+/refs/tags/138.0.7204.188/media/test/data/blackwhite_yuv420p.webm)
- [Pattern comparison test](https://chromium.googlesource.com/chromium/src/+/refs/tags/138.0.7204.188/media/test/data/blackwhite.html)
- [Chromium license](https://chromium.googlesource.com/chromium/src/+/refs/tags/138.0.7204.188/LICENSE)
- Decoded SHA256: `E12372EAED5B3A0CC80254D462AC009F43ADD22341F5071B315104B4D662B05A`.

## License

Copyright 2015 The Chromium Authors

Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions are
met:

- Redistributions of source code must retain the above copyright
  notice, this list of conditions and the following disclaimer.
- Redistributions in binary form must reproduce the above
  copyright notice, this list of conditions and the following disclaimer
  in the documentation and/or other materials provided with the
  distribution.
- Neither the name of Google LLC nor the names of its
  contributors may be used to endorse or promote products derived from
  this software without specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
"AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
(INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
