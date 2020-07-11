        var phraseDiv, statusDiv;
        var key, authorizationToken, appId, phrases;
        var regionOptions;
        var languageOptions, formatOptions, inputSource, filePicker, microphoneSource;
        var SpeechSDK;
        var recognizer;

        var reco;
        var sdkStartContinousRecognitionBtn, sdkStopContinousRecognitionBtn;
        var sdkStartContinousTranslationBtn, sdkStopContinousTranslationBtn;
        var sdkStartRecognizeOnceAsyncBtn, sdkStopRecognizeOnceAsyncBtn, languageTargetOptions, voiceOutput;
        var sdkIntentStartRecognizeOnceAsyncBtn, sdkIntentStopRecognizeOnceAsyncBtn;
        var audioFile, audioFileValid;
        var microphoneId;

        var soundContext = undefined;
        try {
            var AudioContext = window.AudioContext // our preferred impl
                || window.webkitAudioContext       // fallback, mostly when on Safari
                || false;                          // could not find.

            if (AudioContext) {
                soundContext = new AudioContext();
            } else {
                alert("Audio context not supported");
            }
        }
        catch (e) {
            window.console.log("no sound context found, no audio output. " + e);
        }

        document.addEventListener("DOMContentLoaded", function () {
            createBtn = document.getElementById("createBtn");
            sdkStartRecognizeOnceAsyncBtn = document.getElementById("speechsdkStartRecognizeOnceAsync");
            sdkStopRecognizeOnceAsyncBtn = document.getElementById("speechsdkStopRecognizeOnceAsync");
            sdkStartContinousRecognitionBtn = document.getElementById("speechsdkStartContinuousRecognition");
            sdkStopContinousRecognitionBtn = document.getElementById("speechsdkStopContinuousRecognition");
            sdkStartContinousTranslationBtn = document.getElementById("speechsdkStartContinuousTranslation");
            sdkStopContinousTranslationBtn = document.getElementById("speechsdkStopContinuousTranslation");
            sdkIntentStartRecognizeOnceAsyncBtn = document.getElementById("speechsdkIntentStartRecognizeOnceAsync");
            sdkIntentStopRecognizeOnceAsyncBtn = document.getElementById("speechsdkIntentStopRecognizeOnceAsync");
            phraseDiv = document.getElementById("phraseDiv");
            statusDiv = document.getElementById("statusDiv");
            key = document.getElementById("key");
            appId = document.getElementById("appId");
            phrases = document.getElementById("phrases");
            languageOptions = document.getElementById("languageOptions");
            languageTargetOptions = document.getElementById("languageTargetOptions");
            voiceOutput = document.getElementById("voiceOutput");
            regionOptions = document.getElementById("regionOptions");
            formatOptions = document.getElementById("formatOptions");
            inputSource = document.getElementById("inputSource");
            filePicker = document.getElementById('filePicker');
            microphoneSource = document.getElementById("microphoneSource");

            // Starts continuous speech recognition.
            sdkStartContinousRecognitionBtn.addEventListener("click", function () {
                phraseDiv.innerHTML = "";
                statusDiv.innerHTML = "";
                var lastRecognized = "";

                // If an audio file was specified, use it. Else use the microphone.
                // Depending on browser security settings, the user may be prompted to allow microphone use. Using continuous recognition allows multiple
                // phrases to be recognized from a single use authorization.
                var audioConfig;
                if (audioFileValid) {
                    audioConfig = SpeechSDK.AudioConfig.fromWavFileInput(audioFile);
                } else if (undefined != microphoneSource.value) {
                    console.info("Getting Microphone " + microphoneSource.value);
                    audioConfig = SpeechSDK.AudioConfig.fromMicrophoneInput(microphoneSource.value);
                } else {
                    audioConfig = SpeechSDK.AudioConfig.fromDefaultMicrophoneInput();
                }

                var speechConfig;
                if (authorizationToken) {
                    speechConfig = SpeechSDK.SpeechConfig.fromAuthorizationToken(authorizationToken, regionOptions.value);
                } else {
                    if (key.value === "" || key.value === "YOUR_SPEECH_API_KEY") {
                        alert("Please enter your Cognitive Services Speech subscription key!");
                        return;
                    }
                    speechConfig = SpeechSDK.SpeechConfig.fromSubscription(key.value, regionOptions.value);
                }

                speechConfig.speechRecognitionLanguage = languageOptions.value;
                reco = new SpeechSDK.SpeechRecognizer(speechConfig, audioConfig);

                // Before beginning speech recognition, setup the callbacks to be invoked when an event occurs.

                // The event recognizing signals that an intermediate recognition result is received.
                // You will receive one or more recognizing events as a speech phrase is recognized, with each containing
                // more recognized speech. The event will contain the text for the recognition since the last phrase was recognized.
                reco.recognizing = function (s, e) {
                    window.console.log(e);
                    statusDiv.innerHTML += "(recognizing) Reason: " + SpeechSDK.ResultReason[e.result.reason] + " Text: " + e.result.text + "\r\n";
                    phraseDiv.innerHTML = lastRecognized + e.result.text;
                };

                // The event recognized signals that a final recognition result is received.
                // This is the final event that a phrase has been recognized.
                // For continuous recognition, you will get one recognized event for each phrase recognized.
                reco.recognized = function (s, e) {
                    window.console.log(e);

                    // Indicates that recognizable speech was not detected, and that recognition is done.
                    if (e.result.reason === SpeechSDK.ResultReason.NoMatch) {
                        var noMatchDetail = SpeechSDK.NoMatchDetails.fromResult(e.result);
                        statusDiv.innerHTML += "(recognized)  Reason: " + SpeechSDK.ResultReason[e.result.reason] + " NoMatchReason: " + SpeechSDK.NoMatchReason[noMatchDetail.reason] + "\r\n";
                    } else {
                        statusDiv.innerHTML += "(recognized)  Reason: " + SpeechSDK.ResultReason[e.result.reason] + " Text: " + e.result.text + "\r\n";
                    }

                    lastRecognized += e.result.text + "\r\n";
                    phraseDiv.innerHTML = lastRecognized;
                };

                // The event signals that the service has stopped processing speech.
                // https://docs.microsoft.com/javascript/api/microsoft-cognitiveservices-speech-sdk/speechrecognitioncanceledeventargs?view=azure-node-latest
                // This can happen for two broad classes of reasons.
                // 1. An error is encountered.
                //    In this case the .errorDetails property will contain a textual representation of the error.
                // 2. No additional audio is available.
                //    Caused by the input stream being closed or reaching the end of an audio file.
                reco.canceled = function (s, e) {
                    window.console.log(e);

                    statusDiv.innerHTML += "(cancel) Reason: " + SpeechSDK.CancellationReason[e.reason];
                    if (e.reason === SpeechSDK.CancellationReason.Error) {
                        statusDiv.innerHTML += ": " + e.errorDetails;
                    }
                    statusDiv.innerHTML += "\r\n";
                };

                // Signals that a new session has started with the speech service
                reco.sessionStarted = function (s, e) {
                    window.console.log(e);
                    statusDiv.innerHTML += "(sessionStarted) SessionId: " + e.sessionId + "\r\n";
                };

                // Signals the end of a session with the speech service.
                reco.sessionStopped = function (s, e) {
                    window.console.log(e);
                    statusDiv.innerHTML += "(sessionStopped) SessionId: " + e.sessionId + "\r\n";
                    sdkStartContinousRecognitionBtn.disabled = false;
                    sdkStopContinousRecognitionBtn.disabled = true;
                };

                // Signals that the speech service has started to detect speech.
                reco.speechStartDetected = function (s, e) {
                    window.console.log(e);
                    statusDiv.innerHTML += "(speechStartDetected) SessionId: " + e.sessionId + "\r\n";
                };

                // Signals that the speech service has detected that speech has stopped.
                reco.speechEndDetected = function (s, e) {
                    window.console.log(e);
                    statusDiv.innerHTML += "(speechEndDetected) SessionId: " + e.sessionId + "\r\n";
                };

                // Starts recognition
                reco.startContinuousRecognitionAsync();

                sdkStartContinousRecognitionBtn.disabled = true;
                sdkStopContinousRecognitionBtn.disabled = false;
            });

            // Stops recognition and disposes of resources.
            sdkStopContinousRecognitionBtn.addEventListener("click", function () {
                reco.stopContinuousRecognitionAsync(
                    function () {
                        reco.close();
                        reco = undefined;
                    },
                    function (err) {
                        reco.close();
                        reco = undefined;
                    });

                sdkStartContinousRecognitionBtn.disabled = false;
                sdkStopContinousRecognitionBtn.disabled = true;
            });

            // Starts continuous speech translation.
            sdkStartContinousTranslationBtn.addEventListener("click", function () {
                var lastRecognized = "";
                phraseDiv.innerHTML = "";
                statusDiv.innerHTML = "";

                // If an audio file was specified, use it. Else use the microphone.
                // Depending on browser security settings, the user may be prompted to allow microphone use. Using continuous recognition allows multiple
                // phrases to be recognized from a single use authorization.
                var audioConfig;
                if (audioFileValid) {
                    audioConfig = SpeechSDK.AudioConfig.fromWavFileInput(audioFile);
                } else if (undefined != microphoneSource.value) {
                    console.info("Getting Microphone " + microphoneSource.value);
                    audioConfig = SpeechSDK.AudioConfig.fromMicrophoneInput(microphoneSource.value);
                } else {
                    audioConfig = SpeechSDK.AudioConfig.fromDefaultMicrophoneInput();
                }

                var speechConfig;
                if (authorizationToken) {
                    console.log('∞° Token key.value="'+key.value,'"');
                    console.log('∞° Token regionOptions.value="'+regionOptions.value,'"');
                    speechConfig = SpeechSDK.SpeechTranslationConfig.fromAuthorizationToken(authorizationToken, regionOptions.value);
                } else {
                    if (key.value === "" || key.value === "YOUR_SPEECH_API_KEY") {
                        alert("Please enter your Cognitive Services Speech subscription key!");
                        return;
                    }
                    console.log('∞° Key key.value="'+key.value,'"');
                    console.log('∞° Key regionOptions.value="'+regionOptions.value,'"');
                    speechConfig = SpeechSDK.SpeechTranslationConfig.fromSubscription(key.value, regionOptions.value);
                }

                // Set the source language.
                speechConfig.speechRecognitionLanguage = languageOptions.value;

                // Defines the language(s) that speech should be translated to.
                // Multiple languages can be specified for text translation and will be returned in a map.
                speechConfig.addTargetLanguage(languageTargetOptions.value.split("(")[1].substring(0, 5));

                // If voice output is requested, set the target voice.
                // If multiple text translations were requested, only the first one added will have audio synthesised for it.
                if (voiceOutput.checked) {
                    speechConfig.setProperty(SpeechSDK.PropertyId.SpeechServiceConnection_TranslationVoice, languageTargetOptions.value);
                }

                reco = new SpeechSDK.TranslationRecognizer(speechConfig, audioConfig);

                // If Phrases are specified, include them.
                if (phrases !== "") {
                    var phraseListGrammar = SpeechSDK.PhraseListGrammar.fromRecognizer(reco);
                    phraseListGrammar.addPhrase(phrases.value.split(";"));
                }

                // Before beginning speech recognition, setup the callbacks to be invoked when an event occurs.

                /**XXXXX** BEGIN Rem out **XXXXX**
                ***X // The event recognizing signals that an intermediate recognition result is received.
                ***X // You will receive one or more recognizing events as a speech phrase is recognized, with each containing
                ***X // more recognized speech. The event will contain the text for the recognition since the last phrase was recognized.
                ***X // Both the source language text and the translation text(s) are available.
                ***X reco.recognizing = function (s, e) {
                ***X     window.console.log(e);
                ***X     statusDiv.innerHTML += "(recognizing) Reason: " + SpeechSDK.ResultReason[e.result.reason] + " Text: " + e.result.text + " Translations:";
                ***X 
                ***X     var language = languageTargetOptions.value.split("(")[1].substring(0, 2);
                ***X 
                ***X     statusDiv.innerHTML += " [" + language + "] " + e.result.translations.get(language);
                ***X     statusDiv.innerHTML += "\r\n";
                ***X 
                ***X     phraseDiv.innerHTML = lastRecognized + e.result.translations.get(language);
                ***X };
                ***XXXXX**  END  Rem out **XXXXX**/

                // The event recognized signals that a final recognition result is received.
                // This is the final event that a phrase has been recognized.
                // For continuous recognition, you will get one recognized event for each phrase recognized.
                // Both the source language text and the translation text(s) are available.
                reco.recognized = function (s, e) {
                    window.console.log(e);
                    statusDiv.innerHTML += "(recognized)  Reason: " + SpeechSDK.ResultReason[e.result.reason] + " Text: " + e.result.text + " Translations:";

                    var language = languageTargetOptions.value.split("(")[1].substring(0, 2);

                    statusDiv.innerHTML += " [" + language + "] " + e.result.translations.get(language);
                    statusDiv.innerHTML += "\r\n";

                    lastRecognized += e.result.translations.get(language) + "\r\n";
                    phraseDiv.innerHTML = lastRecognized;
                };

                /**XXXXX** BEGIN Rem out **XXXXX**
                ***X // The event signals that the service has stopped processing speech.
                ***X // https://docs.microsoft.com/javascript/api/microsoft-cognitiveservices-speech-sdk/translationrecognitioncanceledeventargs?view=azure-node-latest
                ***X // This can happen for two broad classes of reasons.
                ***X // 1. An error is encountered.
                ***X //    In this case the .errorDetails property will contain a textual representation of the error.
                ***X // 2. No additional audio is available.
                ***X //    Caused by the input stream being closed or reaching the end of an audio file.
                ***X reco.canceled = function (s, e) {
                ***X     window.console.log(e);
                ***X 
                ***X     statusDiv.innerHTML += "(cancel) Reason: " + SpeechSDK.CancellationReason[e.reason] + "\r\n";
                ***X };
                ***XXXXX**  END  Rem out **XXXXX**/

                /**XXXXX** BEGIN Rem out **XXXXX**
                ***X // Signals an audio payload of synthesized speech is ready for playback.
                ***X // If the event result contains valid audio, it's reason will be ResultReason.SynthesizingAudio
                ***X // Once a complete phrase has been synthesized, the event will be called with ResultReason.SynthesizingAudioComplete and a 0 byte audio payload.
                ***X reco.synthesizing = function (s, e) {
                ***X     window.console.log(e);
                ***X 
                ***X     var audioSize = e.result.audio === undefined ? 0 : e.result.audio.byteLength;
                ***X 
                ***X     statusDiv.innerHTML += "(synthesizing) Reason: " + SpeechSDK.ResultReason[e.result.reason] + " " + audioSize + " bytes\r\n";
                ***X 
                ***X     if (e.result.audio && soundContext) {
                ***X         var source = soundContext.createBufferSource();
                ***X         soundContext.decodeAudioData(e.result.audio, function (newBuffer) {
                ***X             source.buffer = newBuffer;
                ***X             source.connect(soundContext.destination);
                ***X             source.start(0);
                ***X         });
                ***X     }
                ***X };
                ***XXXXX**  END  Rem out **XXXXX**/

                /**XXXXX** BEGIN Rem out **XXXXX**
                ***X // Signals that a new session has started with the speech service
                ***X reco.sessionStarted = function (s, e) {
                ***X     window.console.log(e);
                ***X     statusDiv.innerHTML += "(sessionStarted) SessionId: " + e.sessionId + "\r\n";
                ***X };
                ***X 
                ***X // Signals the end of a session with the speech service.
                ***X reco.sessionStopped = function (s, e) {
                ***X     languageTargetOptions.disabled = false;
                ***X     sdkStartContinousTranslationBtn.disabled = false;
                ***X     sdkStopContinousTranslationBtn.disabled = true;
                ***X 
                ***X     window.console.log(e);
                ***X     statusDiv.innerHTML += "(sessionStopped) SessionId: " + e.sessionId + "\r\n";
                ***X     sdkStartContinousRecognitionBtn.disabled = false;
                ***X     sdkStopContinousRecognitionBtn.disabled = true;
                ***X };
                ***XXXXX**  END  Rem out **XXXXX**/

                /**XXXXX** BEGIN Rem out **XXXXX**
                ***X // Signals that the speech service has started to detect speech.
                ***X reco.speechStartDetected = function (s, e) {
                ***X     window.console.log(e);
                ***X     statusDiv.innerHTML += "(speechStartDetected) SessionId: " + e.sessionId + "\r\n";
                ***X };
                ***X 
                ***X // Signals that the speech service has detected that speech has stopped.
                ***X reco.speechEndDetected = function (s, e) {
                ***X     window.console.log(e);
                ***X     statusDiv.innerHTML += "(speechEndDetected) SessionId: " + e.sessionId + "\r\n";
                ***X };
                ***XXXXX**  END  Rem out **XXXXX**/

                reco.startContinuousRecognitionAsync();

                languageTargetOptions.disabled = true;
                sdkStartContinousTranslationBtn.disabled = true;
                sdkStopContinousTranslationBtn.disabled = false;
            });

            sdkStopContinousTranslationBtn.addEventListener("click", function () {
                languageTargetOptions.disabled = false;
                sdkStartContinousTranslationBtn.disabled = false;
                sdkStopContinousTranslationBtn.disabled = true;

                reco.stopContinuousRecognitionAsync(
                    function () {
                        reco.close();
                        reco = undefined;
                    },
                    function (err) {
                        reco.close();
                        reco = undefined;
                    });
            });

            // Demonstrates recognizing a single spoken phrase.
            sdkStartRecognizeOnceAsyncBtn.addEventListener("click", function () {
                phraseDiv.innerHTML = "";
                statusDiv.innerHTML = "";

                // If an audio file was specified, use it. Else use the microphone.
                // Depending on browser security settings, the user may be prompted to allow microphone use. Using continuous recognition allows multiple
                // phrases to be recognized from a single use authorization.
                var audioConfig;
                if (audioFileValid) {
                    audioConfig = SpeechSDK.AudioConfig.fromWavFileInput(audioFile);
                } else if (undefined != microphoneSource.value) {
                    console.info("Getting Microphone " + microphoneSource.value);
                    audioConfig = SpeechSDK.AudioConfig.fromMicrophoneInput(microphoneSource.value);
                } else {
                    audioConfig = SpeechSDK.AudioConfig.fromDefaultMicrophoneInput();
                }

                var speechConfig;
                if (authorizationToken) {
                    speechConfig = SpeechSDK.SpeechConfig.fromAuthorizationToken(authorizationToken, regionOptions.value);
                } else {
                    if (key.value === "" || key.value === "YOUR_SPEECH_API_KEY") {
                        alert("Please enter your Cognitive Services Speech subscription key!");
                        return;
                    }
                    speechConfig = SpeechSDK.SpeechConfig.fromSubscription(key.value, regionOptions.value);
                }

                speechConfig.speechRecognitionLanguage = languageOptions.value;
                reco = new SpeechSDK.SpeechRecognizer(speechConfig, audioConfig);

                // If Phrase are specified, include them.
                if (phrases !== "") {
                    var phraseListGrammar = SpeechSDK.PhraseListGrammar.fromRecognizer(reco);
                    phraseListGrammar.addPhrase(phrases.value.split(";"));
                }

                // Before beginning speech recognition, setup the callbacks to be invoked when an event occurs.

                // The event recognizing signals that an intermediate recognition result is received.
                // You will receive one or more recognizing events as a speech phrase is recognized, with each containing
                // more recognized speech. The event will contain the text for the recognition since the last phrase was recognized.
                reco.recognizing = function (s, e) {
                    window.console.log(e);
                    statusDiv.innerHTML += "(recognizing) Reason: " + SpeechSDK.ResultReason[e.result.reason] + " Text: " + e.result.text + "\r\n";
                    phraseDiv.innerHTML = e.result.text;
                };

                // The event signals that the service has stopped processing speech.
                // https://docs.microsoft.com/javascript/api/microsoft-cognitiveservices-speech-sdk/speechrecognitioncanceledeventargs?view=azure-node-latest
                // This can happen for two broad classes or reasons.
                // 1. An error is encountered.
                //    In this case the .errorDetails property will contain a textual representation of the error.
                // 2. No additional audio is available.
                //    Caused by the input stream being closed or reaching the end of an audio file.
                reco.canceled = function (s, e) {
                    window.console.log(e);

                    statusDiv.innerHTML += "(cancel) Reason: " + SpeechSDK.CancellationReason[e.reason];
                    if (e.reason === SpeechSDK.CancellationReason.Error) {
                        statusDiv.innerHTML += ": " + e.errorDetails;
                    }
                    statusDiv.innerHTML += "\r\n";
                };

                // The event recognized signals that a final recognition result is received.
                // This is the final event that a phrase has been recognized.
                // For continuous recognition, you will get one recognized event for each phrase recognized.
                reco.recognized = function (s, e) {
                    window.console.log(e);

                    // Indicates that recognizable speech was not detected, and that recognition is done.
                    if (e.result.reason === SpeechSDK.ResultReason.NoMatch) {
                        var noMatchDetail = SpeechSDK.NoMatchDetails.fromResult(e.result);
                        statusDiv.innerHTML += "(recognized)  Reason: " + SpeechSDK.ResultReason[e.result.reason] + " NoMatchReason: " + SpeechSDK.NoMatchReason[noMatchDetail.reason] + "\r\n";
                    } else {
                        statusDiv.innerHTML += "(recognized)  Reason: " + SpeechSDK.ResultReason[e.result.reason] + " Text: " + e.result.text + "\r\n";
                    }
                };

                // Signals that a new session has started with the speech service
                reco.sessionStarted = function (s, e) {
                    window.console.log(e);
                    statusDiv.innerHTML += "(sessionStarted) SessionId: " + e.sessionId + "\r\n";
                };

                // Signals the end of a session with the speech service.
                reco.sessionStopped = function (s, e) {
                    window.console.log(e);
                    statusDiv.innerHTML += "(sessionStopped) SessionId: " + e.sessionId + "\r\n";
                    sdkStartContinousRecognitionBtn.disabled = false;
                    sdkStopContinousRecognitionBtn.disabled = true;
                };

                // Signals that the speech service has started to detect speech.
                reco.speechStartDetected = function (s, e) {
                    window.console.log(e);
                    statusDiv.innerHTML += "(speechStartDetected) SessionId: " + e.sessionId + "\r\n";
                };

                // Signals that the speech service has detected that speech has stopped.
                reco.speechEndDetected = function (s, e) {
                    window.console.log(e);
                    statusDiv.innerHTML += "(speechEndDetected) SessionId: " + e.sessionId + "\r\n";
                };

                // Note: this is how you can process the result directly
                //       rather then subscribing to the recognized
                //       event
                // The continuation below shows how to get the same data from the final result as you'd get from the
                // events above.
                reco.recognizeOnceAsync(
                    function (result) {
                        window.console.log(result);

                        statusDiv.innerHTML += "(continuation) Reason: " + SpeechSDK.ResultReason[result.reason];
                        switch (result.reason) {
                            case SpeechSDK.ResultReason.RecognizedSpeech:
                                statusDiv.innerHTML += " Text: " + result.text;
                                break;
                            case SpeechSDK.ResultReason.NoMatch:
                                var noMatchDetail = SpeechSDK.NoMatchDetails.fromResult(result);
                                statusDiv.innerHTML += " NoMatchReason: " + SpeechSDK.NoMatchReason[noMatchDetail.reason];
                                break;
                            case SpeechSDK.ResultReason.Canceled:
                                var cancelDetails = SpeechSDK.CancellationDetails.fromResult(result);
                                statusDiv.innerHTML += " CancellationReason: " + SpeechSDK.CancellationReason[cancelDetails.reason];

                                if (cancelDetails.reason === SpeechSDK.CancellationReason.Error) {
                                    statusDiv.innerHTML += ": " + cancelDetails.errorDetails;
                                }
                                break;
                        }
                        statusDiv.innerHTML += "\r\n";

                        phraseDiv.innerHTML = result.text + "\r\n";

                        sdkStopRecognizeOnceAsyncBtn.click();
                    },
                    function (err) {
                        window.console.log(err);

                        phraseDiv.innerHTML += "ERROR: " + err;

                        sdkStopRecognizeOnceAsyncBtn.click();
                    });

                sdkStartRecognizeOnceAsyncBtn.disabled = true;
                sdkStopRecognizeOnceAsyncBtn.disabled = false;
            });

            sdkStopRecognizeOnceAsyncBtn.addEventListener("click", function () {
                sdkStartRecognizeOnceAsyncBtn.disabled = false;
                sdkStopRecognizeOnceAsyncBtn.disabled = true;

                reco.close();
                reco = undefined;
            });

            // Demonstrates recognizing a single spoken phrase.
            sdkIntentStartRecognizeOnceAsyncBtn.addEventListener("click", function () {
                phraseDiv.innerHTML = "";
                statusDiv.innerHTML = "";

                // If an audio file was specified, use it. Else use the microphone.
                // Depending on browser security settings, the user may be prompted to allow microphone use. Using continuous recognition allows multiple
                // phrases to be recognized from a single use authorization.
                var audioConfig;
                if (audioFileValid) {
                    audioConfig = SpeechSDK.AudioConfig.fromWavFileInput(audioFile);
                } else if (undefined != microphoneSource.value) {
                    console.info("Getting Microphone " + microphoneSource.value);
                    audioConfig = SpeechSDK.AudioConfig.fromMicrophoneInput(microphoneSource.value);
                } else {
                    audioConfig = SpeechSDK.AudioConfig.fromDefaultMicrophoneInput();
                }

                var speechConfig;
                if (authorizationToken) {
                    speechConfig = SpeechSDK.SpeechConfig.fromAuthorizationToken(authorizationToken, regionOptions.value);
                } else {
                    if (key.value === "" || key.value === "YOUR_SPEECH_API_KEY") {
                        alert("Please enter your Cognitive Services Speech subscription key!");
                        return;
                    }
                    speechConfig = SpeechSDK.SpeechConfig.fromSubscription(key.value, regionOptions.value);
                }

                speechConfig.speechRecognitionLanguage = languageOptions.value;
                reco = new SpeechSDK.IntentRecognizer(speechConfig, audioConfig);

                // Set up a Language Understanding Model from Language Understanding Intelligent Service (LUIS).
                // See https://www.luis.ai/home for more information on LUIS.
                if (appId.value !== "" && appId.value !== "YOUR_LANGUAGE_UNDERSTANDING_APP_ID") {
                    var lm = SpeechSDK.LanguageUnderstandingModel.fromAppId(appId.value);

                    reco.addAllIntents(lm);
                }

                // If Phrases are specified, include them.
                if (phrases !== "") {
                    var phraseListGrammar = SpeechSDK.PhraseListGrammar.fromRecognizer(reco);
                    phraseListGrammar.addPhrase(phrases.value.split(";"));
                }

                // Before beginning speech recognition, setup the callbacks to be invoked when an event occurs.

                // The event recognizing signals that an intermediate recognition result is received.
                // You will receive one or more recognizing events as a speech phrase is recognized, with each containing
                // more recognized speech. The event will contain the text for the recognition since the last phrase was recognized.
                reco.recognizing = function (s, e) {
                    window.console.log(e);
                    statusDiv.innerHTML += "(recognizing) Reason: " + SpeechSDK.ResultReason[e.result.reason] + " Text: " + e.result.text + "\r\n";
                    phraseDiv.innerHTML = e.result.text;
                };

                // The event signals that the service has stopped processing speech.
                // https://docs.microsoft.com/javascript/api/microsoft-cognitiveservices-speech-sdk/speechrecognitioncanceledeventargs?view=azure-node-latest
                // This can happen for two broad classes or reasons.
                // 1. An error is encountered.
                //    In this case the .errorDetails property will contain a textual representation of the error.
                // 2. No additional audio is available.
                //    Caused by the input stream being closed or reaching the end of an audio file.
                reco.canceled = function (s, e) {
                    window.console.log(e);

                    statusDiv.innerHTML += "(cancel) Reason: " + SpeechSDK.CancellationReason[e.reason];
                    if (e.reason === SpeechSDK.CancellationReason.Error) {
                        statusDiv.innerHTML += ": " + e.errorDetails;
                    }
                    statusDiv.innerHTML += "\r\n";
                };

                // The event recognized signals that a final recognition result is received.
                // This is the final event that a phrase has been recognized.
                // For continuous recognition, you will get one recognized event for each phrase recognized.
                reco.recognized = function (s, e) {
                    window.console.log(e);

                    statusDiv.innerHTML += "(recognized)  Reason: " + SpeechSDK.ResultReason[e.result.reason];

                    // Depending on what result reason is returned, different properties will be populated.
                    switch (e.result.reason) {
                        // This case occurs when speech was successfully recognized, but the speech did not match an intent from the Language Understanding Model.
                        case SpeechSDK.ResultReason.RecognizedSpeech:
                            statusDiv.innerHTML += " Text: " + e.result.text;
                            break;

                        // Both speech an intent from the model was recognized.
                        case SpeechSDK.ResultReason.RecognizedIntent:
                            statusDiv.innerHTML += " Text: " + e.result.text + " IntentId: " + e.result.intentId;

                            // The actual JSON returned from Language Understanding is a bit more complex to get to, but it is available for things like
                            // the entity name and type if part of the intent.
                            statusDiv.innerHTML += " Intent JSON: " + e.result.properties.getProperty(SpeechSDK.PropertyId.LanguageUnderstandingServiceResponse_JsonResult);
                            break;

                        // No match was found.
                        case SpeechSDK.ResultReason.NoMatch:
                            var noMatchDetail = SpeechSDK.NoMatchDetails.fromResult(e.result);
                            statusDiv.innerHTML += " NoMatchReason: " + SpeechSDK.NoMatchReason[noMatchDetail.reason];
                            break;
                    }
                    statusDiv.innerHTML += "\r\n";
                };

                // Signals that a new session has started with the speech service
                reco.sessionStarted = function (s, e) {
                    window.console.log(e);
                    statusDiv.innerHTML += "(sessionStarted) SessionId: " + e.sessionId + "\r\n";
                };

                // Signals the end of a session with the speech service.
                reco.sessionStopped = function (s, e) {
                    window.console.log(e);
                    statusDiv.innerHTML += "(sessionStopped) SessionId: " + e.sessionId + "\r\n";
                    sdkStartContinousRecognitionBtn.disabled = false;
                    sdkStopContinousRecognitionBtn.disabled = true;
                };

                // Signals that the speech service has started to detect speech.
                reco.speechStartDetected = function (s, e) {
                    window.console.log(e);
                    statusDiv.innerHTML += "(speechStartDetected) SessionId: " + e.sessionId + "\r\n";
                };

                // Signals that the speech service has detected that speech has stopped.
                reco.speechEndDetected = function (s, e) {
                    window.console.log(e);
                    statusDiv.innerHTML += "(speechEndDetected) SessionId: " + e.sessionId + "\r\n";
                };

                // Note: this is how you can process the result directly
                //       rather then subscribing to the recognized
                //       event
                // The continuation below shows how to get the same data from the final result as you'd get from the
                // events above.
                reco.recognizeOnceAsync(
                    function (result) {
                        window.console.log(result);

                        phraseDiv.innerHTML = result.text + "\r\n";

                        statusDiv.innerHTML += "(continuation) Reason: " + SpeechSDK.ResultReason[result.reason];
                        switch (result.reason) {
                            case SpeechSDK.ResultReason.RecognizedSpeech:
                                statusDiv.innerHTML += " Text: " + result.text;
                                break;
                            case SpeechSDK.ResultReason.RecognizedIntent:
                                statusDiv.innerHTML += " Text: " + result.text + " IntentId: " + result.intentId;

                                // The actual JSON returned from Language Understanding is a bit more complex to get to, but it is available for things like
                                // the entity name and type if part of the intent.
                                statusDiv.innerHTML += " Intent JSON: " + result.properties.getProperty(SpeechSDK.PropertyId.LanguageUnderstandingServiceResponse_JsonResult);
                                phraseDiv.innerHTML += result.properties.getProperty(SpeechSDK.PropertyId.LanguageUnderstandingServiceResponse_JsonResult) + "\r\n";
                                break;
                            case SpeechSDK.ResultReason.NoMatch:
                                var noMatchDetail = SpeechSDK.NoMatchDetails.fromResult(result);
                                statusDiv.innerHTML += " NoMatchReason: " + SpeechSDK.NoMatchReason[noMatchDetail.reason];
                                break;
                            case SpeechSDK.ResultReason.Canceled:
                                var cancelDetails = SpeechSDK.CancellationDetails.fromResult(result);
                                statusDiv.innerHTML += " CancellationReason: " + SpeechSDK.CancellationReason[cancelDetails.reason];

                                if (cancelDetails.reason === SpeechSDK.CancellationReason.Error) {
                                    statusDiv.innerHTML += ": " + cancelDetails.errorDetails;
                                }
                                break;
                        }
                        statusDiv.innerHTML += "\r\n";

                        sdkStopRecognizeOnceAsyncBtn.click();
                    },
                    function (err) {
                        window.console.log(err);

                        phraseDiv.innerHTML += "ERROR: " + err;

                        sdkStopRecognizeOnceAsyncBtn.click();
                    });

                sdkStartRecognizeOnceAsyncBtn.disabled = true;
                sdkStopRecognizeOnceAsyncBtn.disabled = false;
            });

            sdkIntentStopRecognizeOnceAsyncBtn.addEventListener("click", function () {
                sdkStartRecognizeOnceAsyncBtn.disabled = false;
                sdkStopRecognizeOnceAsyncBtn.disabled = true;

                reco.close();
                reco = undefined;
            });

            key.addEventListener("focus", function () {
                if (key.value === "YOUR_SPEECH_API_KEY") {
                    key.value = "";
                }
            });

            key.addEventListener("focusout", function () {
                if (key.value === "") {
                    key.value = "YOUR_SPEECH_API_KEY";
                }
            });

            appId.addEventListener("focus", function () {
                if (key.value === "YOUR_LANGUAGE_UNDERSTANDING_APP_ID") {
                    key.value = "";
                }
            });

            appId.addEventListener("focusout", function () {
                if (key.value === "") {
                    key.value = "YOUR_LANGUAGE_UNDERSTANDING_APP_ID";
                }
            });

            inputSource.addEventListener("change", function () {
                audioFileValid = inputSource.value === "File";

                if (inputSource.value === "File") {
                    microphoneSource.disabled = true;
                    filePicker.click();
                    return;
                } else {
                    microphoneSource.disabled = false;

                }
            });

            filePicker.addEventListener("change", function () {
                audioFile = filePicker.files[0];
            });

            if (navigator && navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {

                // Enumerate the media devices.
                navigator.mediaDevices.enumerateDevices().then((devices) => {
                    var opt = document.createElement('option');
                    opt.appendChild(document.createTextNode(""));
                    opt.value = undefined;
                    microphoneSource.appendChild(opt);

                    for (const device of devices) {
                        if (device.kind === "audioinput") {
                            microphoneSource.style = "";
                            // create new option element
                            var opt = document.createElement('option');

                            // create text node to add to option element (opt)
                            opt.appendChild(document.createTextNode(device.label));

                            // set value property of opt
                            opt.value = device.deviceId;

                            microphoneSource.appendChild(opt);
                        }
                    }
                });
            }

            Initialize(function (speechSdk) {
                SpeechSDK = speechSdk;
                sdkStartContinousRecognitionBtn.disabled = false;
                sdkStartRecognizeOnceAsyncBtn.disabled = false;

                // in case we have a function for getting an authorization token, call it.
                if (typeof RequestAuthorizationToken === "function") {
                    RequestAuthorizationToken();
                }
            });
        });
