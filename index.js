var Wharton = Wharton || {
    VoiceChatAPI: (function () {
        let _speechRecognition;

        function transcribe_text({ qualtrics_context, live_display=false, embedded_data_field='auto_transcript', debug=false }) {
            window.SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            const question = qualtrics_context.getQuestionContainer();
            question.innerHTML += '<p id="finished_transcription"></p>';
            question.innerHTML += '<p id="current_transcription"></p>';

            const mic = document.createElement('button');
            mic.innerHTML = "🎤";
            mic.style.fontSize = "20px";
            mic.style.backgroundColor = "white";
            mic.style.border = "none";
            mic.style.cursor = "pointer";
            mic.style.marginLeft = "10px";
            mic.style.marginTop = "10px";
            mic.style.marginBottom = "10px";
            mic.style.padding = "5px";
            mic.style.borderRadius = "5px";
            mic.style.boxShadow = "0px 0px 5px 0px #000000";
            mic.id = "start_button";
            question.appendChild(mic);

            const stop = document.createElement('button');
            stop.innerHTML = "🛑";
            stop.style.fontSize = "20px";
            stop.style.backgroundColor = "white";
            stop.style.border = "none";
            stop.style.cursor = "pointer";
            stop.style.marginLeft = "10px";
            stop.style.marginTop = "10px";
            stop.style.marginBottom = "10px";
            stop.style.padding = "5px";
            stop.style.borderRadius = "5px";
            stop.style.boxShadow = "0px 0px 5px 0px #000000";
            stop.id = "stop_button";
            stop.hidden = true;
            question.appendChild(stop);

            if (window.SpeechRecognition) {
                document.getElementById('start_button').onclick = function () {
                    qualtrics_context.hideNextButton();
                    _speechRecognition = new SpeechRecognition();
                    _speechRecognition.interimResults = true;
                    _speechRecognition.lang = 'en-US';
                    _speechRecognition.continuous = true;
                    _speechRecognition.start();

                    _speechRecognition.onresult = function (event) {
                        let auto_transcript = Qualtrics.SurveyEngine.getJSEmbeddedData(embedded_data_field) || '';
                        let auto_transcript_html = '';
                        for (let i = event.resultIndex; i < event.results.length; i++) {
                            if (event.results[i].isFinal) {
                                const transcript_snippet = event.results[i][0].transcript.trim();
                                auto_transcript += '\n' + transcript_snippet;
                                auto_transcript_html += transcript_snippet + '<br/>';
                                Qualtrics.SurveyEngine.setJSEmbeddedData(embedded_data_field, auto_transcript);
                                if (live_display) {
                                    document.getElementById('finished_transcription').innerHTML = auto_transcript_html;
                                    document.getElementById('current_transcription').innerHTML = "";
                                }
                            } else {
                                auto_transcript += ' ' + event.results[i][0].transcript.trim();
                                auto_transcript_html = auto_transcript;
                                if (live_display) {
                                    document.getElementById('current_transcription').innerHTML = auto_transcript_html;
                                }
                            }
                        }
                        mic.hidden = true;
                        stop.hidden = false;
                    };

                    document.getElementById('stop_button').onclick = function () {
                        _speechRecognition.stop();
                        qualtrics_context.showNextButton();
                        mic.hidden = false;
                        stop.hidden = true;
                    };

                    _speechRecognition.onend = function () {
                        _speechRecognition.stop();
                        qualtrics_context.showNextButton();
                    };

                    _speechRecognition.onerror = function (event) {
                        _speechRecognition.stop();
                        qualtrics_context.showNextButton();
                        console.log(event.error);
                    };
                }
            }
        }

        function save_embedded_data({ embedded_data_field, debug=false }) {
            const transcript = Qualtrics.SurveyEngine.getJSEmbeddedData(embedded_data_field);
            Qualtrics.SurveyEngine.setEmbeddedData(embedded_data_field, transcript);
            if (debug) {
                console.log(`${embedded_data_field}: ${Qualtrics.SurveyEngine.getEmbeddedData(embedded_data_field)}`);
            }
        }

        function adjust_audio_player_voice_commands({ src_url, qualtrics_context, max_range=10, debug=false, start_vol, disable_controls=[], metrics=false, metrics_prefix="" }) {
            function adjustVolume(audio, increase, percent) {
                var newVolume;
                if (increase) {
                    newVolume = audio.volume + (audio.volume * (percent / 100));
                } else {
                    newVolume = audio.volume - (audio.volume * (percent / 100));
                }
                audio.volume = Math.min(Math.max(newVolume, 0), 1);
            }

            if (metrics) {
                ['vol_set_to', 'mute', 'vol_up', 'vol_down'].forEach((key) => {
                    Qualtrics.SurveyEngine.setEmbeddedData(`${metrics_prefix}${key}_count`, 0);
                });
            }

            const audio = document.createElement('audio');
            audio.setAttribute('controls', '');
            audio.setAttribute('src', src_url);
            audio.style.width = '100%';
            qualtrics_context.getQuestionContainer().appendChild(audio);

            if (start_vol) {
                audio.volume = start_vol / max_range;
            }
            audio.play();

            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            const SpeechGrammarList = window.SpeechGrammarList || window.webkitSpeechGrammarList;

            const vol_settings = new Array(max_range + 1);
            for (let i = 0; i <= max_range; i++) {
                vol_settings[i] = i;
            }
            const vol_cmd_grammar = `
                #JSGF V1.0;
                grammar vol_cmds;
                <vol_level> = ${vol_settings.join(' | ')};
                <vol_cmd> = set volume to <vol_level> | volume up | volume down | mute;
            `;

            _speechRecognition = new SpeechRecognition();
            _speechRecognition.lang = 'en-US';
            _speechRecognition.continuous = true;
            const speechRecognitionList = new SpeechGrammarList();
            speechRecognitionList.addFromString(vol_cmd_grammar, 1);
            _speechRecognition.grammars = speechRecognitionList;

            const word2digit = {
                "zero": 0, "one": 1, "two": 2, "three": 3, "four": 4, "five": 5,
                "six": 6, "seven": 7, "eight": 8, "nine": 9, "ten": 10,
                "eleven": 11, "twelve": 12, "thirteen": 13, "fourteen": 14, "fifteen": 15,
                "sixteen": 16, "seventeen": 17, "eighteen": 18, "nineteen": 19, "twenty": 20
            };

            const disabled_controls = new Set(disable_controls);

            const set_vol_digit = /^set volume to (\d+)/;
            const set_vol_word = /^set volume to (\w+(?:\s|-)*\w+)/;

            _speechRecognition.onresult = (e) => {
                const result = e.results[e.results.length - 1][0].transcript.trim().toLowerCase();
                let match;

                if (match = result.match(set_vol_digit)) {
                    const vol = parseInt(match[1]);
                    if (!disabled_controls.has('exact_vol') && vol >= 0 && vol <= max_range) {
                        if (metrics) {
                            const i = parseInt(Qualtrics.SurveyEngine.getEmbeddedData(`${metrics_prefix}vol_set_to_count`) || 0);
                            Qualtrics.SurveyEngine.setEmbeddedData(`${metrics_prefix}vol_set_to_count`, i + 1);
                        }
                        audio.volume = vol / max_range;
                    }
                } else if (match = result.match(set_vol_word)) {
                    const word = match[1];
                    if (!disabled_controls.has('exact_vol') && word in word2digit) {
                        if (metrics) {
                            const i = parseInt(Qualtrics.SurveyEngine.getEmbeddedData(`${metrics_prefix}vol_set_to_count`) || 0);
                            Qualtrics.SurveyEngine.setEmbeddedData(`${metrics_prefix}vol_set_to_count`, i + 1);
                        }
                        audio.volume = word2digit[word] / max_range;
                    }
                } else if (result.includes("volume up")) {
                    if (!disabled_controls.has('vol_up')) {
                        if (metrics) {
                            const i = parseInt(Qualtrics.SurveyEngine.getEmbeddedData(`${metrics_prefix}vol_up_count`) || 0);
                            Qualtrics.SurveyEngine.setEmbeddedData(`${metrics_prefix}vol_up_count`, i + 1);
                        }
                        audio.volume = Math.min(audio.volume + 1 / max_range, 1.0);
                    }
                } else if (result.includes("volume down")) {
                    if (!disabled_controls.has('vol_down')) {
                        if (metrics) {
                            const i = parseInt(Qualtrics.SurveyEngine.getEmbeddedData(`${metrics_prefix}vol_down_count`) || 0);
                            Qualtrics.SurveyEngine.setEmbeddedData(`${metrics_prefix}vol_down_count`, i + 1);
                        }
                        audio.volume = Math.max(audio.volume - 1 / max_range, 0.0);
                    }
                } else if (result === "mute") {
                    if (!disabled_controls.has('mute')) {
                        if (metrics) {
                            const i = parseInt(Qualtrics.SurveyEngine.getEmbeddedData(`${metrics_prefix}mute_count`) || 0);
                            Qualtrics.SurveyEngine.setEmbeddedData(`${metrics_prefix}mute_count`, i + 1);
                        }
                        audio.volume = 0;
                    }
                }

                if (debug) {
                    console.log('Result: ', result);
                    console.log('Volume: ', audio.volume);
                }
            };

            if (debug) {
                _speechRecognition.onerror = (e) => {
                    console.error('Speech recognition error:', e.error);
                };
            }

            _speechRecognition.onend = (e) => {
                _speechRecognition.start();
            };

            _speechRecognition.start();
        }

        function cleanup() {
            if (_speechRecognition) {
                _speechRecognition.onend = null;
                _speechRecognition.onerror = null;
                _speechRecognition.stop();
                _speechRecognition = null;
            }
        }

        return {
            transcribe_text: transcribe_text,
            save_embedded_data: save_embedded_data,
            adjust_audio_player_voice_commands: adjust_audio_player_voice_commands,
            cleanup: cleanup,
        }
    })()
};
