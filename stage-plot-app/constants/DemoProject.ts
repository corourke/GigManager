import { Project } from '../models';

export const DEMO_PROJECT: Project = {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Demo Project",
    "devices": [
        {
            "id": "dev-vox1",
            "name": "VOX 1",
            "type": "Microphone",
            "model": "SM58",
            "groupId": "8fyedcmnemnjsw2c3",
            "inputChannels": [],
            "outputChannels": [
                {
                    "id": "ch-vox1-out",
                    "number": 1,
                    "name": "Output",
                    "channelCount": 1,
                    "connectorType": "XLR",
                    "phantomPower": false,
                    "pad": false
                }
            ],
            "metadata": {
                "generalName": "VOX 1"
            },
            "position": {
                "x": 0,
                "y": 30
            },
            "isSource": true
        },
        {
            "id": "dev-vox2",
            "name": "VOX 2",
            "type": "Microphone",
            "model": "SM58",
            "groupId": "8fyedcmnemnjsw2c3",
            "inputChannels": [],
            "outputChannels": [
                {
                    "id": "ch-vox2-out",
                    "number": 1,
                    "name": "Output",
                    "channelCount": 1,
                    "connectorType": "XLR",
                    "phantomPower": false,
                    "pad": false
                }
            ],
            "metadata": {
                "generalName": "VOX 2"
            },
            "position": {
                "x": 0,
                "y": 70
            },
            "isSource": true
        },
        {
            "id": "dev-kick",
            "name": "Kick",
            "type": "Microphone",
            "model": "Beta 52",
            "groupId": "5t3khfa0xmnjsvy79",
            "inputChannels": [],
            "outputChannels": [
                {
                    "id": "ch-kick-out",
                    "number": 1,
                    "name": "Output",
                    "channelCount": 1,
                    "connectorType": "XLR",
                    "phantomPower": true,
                    "pad": false
                }
            ],
            "metadata": {
                "generalName": "Kick"
            },
            "position": {
                "x": 0,
                "y": 110
            },
            "isSource": true
        },
        {
            "id": "dev-snare",
            "name": "Snare",
            "type": "Microphone",
            "model": "SM57",
            "groupId": "5t3khfa0xmnjsvy79",
            "inputChannels": [],
            "outputChannels": [
                {
                    "id": "ch-snare-out",
                    "number": 1,
                    "name": "Output",
                    "channelCount": 1,
                    "connectorType": "XLR",
                    "phantomPower": false,
                    "pad": false
                }
            ],
            "metadata": {
                "generalName": "Snare"
            },
            "position": {
                "x": 0,
                "y": 150
            },
            "isSource": true
        },
        {
            "id": "dev-tom",
            "name": "Tom",
            "type": "Microphone",
            "model": "e904",
            "groupId": "5t3khfa0xmnjsvy79",
            "inputChannels": [],
            "outputChannels": [
                {
                    "id": "ch-tom-out",
                    "number": 1,
                    "name": "Output",
                    "channelCount": 1,
                    "connectorType": "XLR",
                    "phantomPower": false,
                    "pad": false
                }
            ],
            "metadata": {
                "generalName": "Tom"
            },
            "position": {
                "x": 0,
                "y": 190
            },
            "isSource": true
        },
        {
            "id": "dev-keys",
            "name": "Keys",
            "type": "Instrument",
            "model": "Nord Stage",
            "groupId": "grp-stage",
            "inputChannels": [],
            "outputChannels": [
                {
                    "id": "ch-keys-outl",
                    "number": 1,
                    "name": "",
                    "channelCount": 1,
                    "connectorType": "1/4\"",
                    "phantomPower": false,
                    "pad": false
                },
                {
                    "id": "ch-keys-outr",
                    "number": 2,
                    "name": "",
                    "channelCount": 1,
                    "connectorType": "1/4\"",
                    "phantomPower": false,
                    "pad": false
                }
            ],
            "metadata": {
                "generalName": "Keys"
            },
            "position": {
                "x": 0,
                "y": 300
            },
            "isSource": true
        },
        {
            "id": "dev-stagebox",
            "name": "Stagebox A",
            "type": "Stagebox",
            "model": "S16",
            "groupId": "grp-stage",
            "inputChannels": [
                {
                    "id": "ch-sb-in1",
                    "number": 1,
                    "name": "",
                    "channelCount": 1,
                    "connectorType": "XLR",
                    "phantomPower": false,
                    "pad": false
                },
                {
                    "id": "ch-sb-in2",
                    "number": 2,
                    "name": "",
                    "channelCount": 1,
                    "connectorType": "XLR",
                    "phantomPower": false,
                    "pad": false
                },
                {
                    "id": "ch-sb-in3",
                    "number": 3,
                    "name": "",
                    "channelCount": 1,
                    "connectorType": "XLR",
                    "phantomPower": false,
                    "pad": false
                },
                {
                    "id": "ch-sb-in4",
                    "number": 4,
                    "name": "",
                    "channelCount": 1,
                    "connectorType": "XLR",
                    "phantomPower": false,
                    "pad": false
                },
                {
                    "id": "ch-sb-in5",
                    "number": 5,
                    "name": "",
                    "channelCount": 1,
                    "connectorType": "XLR",
                    "phantomPower": false,
                    "pad": false
                },
                {
                    "id": "ch-sb-in6",
                    "number": 6,
                    "name": "",
                    "channelCount": 1,
                    "connectorType": "XLR",
                    "phantomPower": false,
                    "pad": false
                },
                {
                    "id": "ch-sb-in7",
                    "number": 7,
                    "name": "",
                    "channelCount": 1,
                    "connectorType": "XLR",
                    "phantomPower": false,
                    "pad": false
                },
                {
                    "id": "hqbxbmqtjmnj22x8n",
                    "number": 8,
                    "name": "",
                    "channelCount": 1,
                    "connectorType": "XLR",
                    "phantomPower": false,
                    "pad": false
                }
            ],
            "outputChannels": [
                {
                    "id": "ch-sb-out1",
                    "number": 1,
                    "name": "",
                    "channelCount": 1,
                    "connectorType": "XLR",
                    "phantomPower": false,
                    "pad": false
                },
                {
                    "id": "qcln6oxv4mnj1e720",
                    "number": 2,
                    "name": "",
                    "channelCount": 1,
                    "connectorType": "XLR",
                    "phantomPower": false,
                    "pad": false
                },
                {
                    "id": "tnoaq60hamnj1e7ji",
                    "number": 3,
                    "name": "",
                    "channelCount": 1,
                    "connectorType": "XLR",
                    "phantomPower": false,
                    "pad": false
                },
                {
                    "id": "h1goacg0wmnj1e7sr",
                    "number": 4,
                    "name": "",
                    "channelCount": 1,
                    "connectorType": "XLR",
                    "phantomPower": false,
                    "pad": false
                },
                {
                    "id": "36t23tav7mnj1e80p",
                    "number": 5,
                    "name": "",
                    "channelCount": 1,
                    "connectorType": "XLR",
                    "phantomPower": false,
                    "pad": false
                },
                {
                    "id": "d5js1tov2mnj1e89e",
                    "number": 6,
                    "name": "",
                    "channelCount": 1,
                    "connectorType": "XLR",
                    "phantomPower": false,
                    "pad": false
                },
                {
                    "id": "hjolsxki5mnj1e9y5",
                    "number": 7,
                    "name": "",
                    "channelCount": 1,
                    "connectorType": "XLR",
                    "phantomPower": false,
                    "pad": false
                },
                {
                    "id": "wvk62zlgumnj1eaab",
                    "number": 8,
                    "name": "",
                    "channelCount": 1,
                    "connectorType": "XLR",
                    "phantomPower": false,
                    "pad": false
                }
            ],
            "metadata": {},
            "position": {
                "x": 330,
                "y": 10
            }
        },
        {
            "id": "dev-mixer",
            "name": "FOH Mixer",
            "type": "Mixer",
            "model": "X32",
            "groupId": "grp-foh",
            "inputChannels": [
                {
                    "id": "ch-mx-in1",
                    "number": 1,
                    "name": "",
                    "channelCount": 1,
                    "connectorType": "XLR",
                    "phantomPower": false,
                    "pad": false
                },
                {
                    "id": "ax42l92lpmnj1dlwj",
                    "number": 2,
                    "name": "",
                    "channelCount": 1,
                    "connectorType": "XLR",
                    "phantomPower": false,
                    "pad": false
                },
                {
                    "id": "9vbl54r6dmnj1dmbs",
                    "number": 3,
                    "name": "",
                    "channelCount": 1,
                    "connectorType": "XLR",
                    "phantomPower": false,
                    "pad": false
                },
                {
                    "id": "30pd619z7mnj1dml2",
                    "number": 4,
                    "name": "",
                    "channelCount": 1,
                    "connectorType": "XLR",
                    "phantomPower": false,
                    "pad": false
                },
                {
                    "id": "lflnfc7olmnj1dmts",
                    "number": 5,
                    "name": "",
                    "channelCount": 1,
                    "connectorType": "XLR",
                    "phantomPower": false,
                    "pad": false
                },
                {
                    "id": "pjzw0r8zwmnj1dn26",
                    "number": 6,
                    "name": "",
                    "channelCount": 1,
                    "connectorType": "XLR",
                    "phantomPower": false,
                    "pad": false
                },
                {
                    "id": "9ef1c7o7bmnj1dnby",
                    "number": 7,
                    "name": "",
                    "channelCount": 1,
                    "connectorType": "XLR",
                    "phantomPower": false,
                    "pad": false
                },
                {
                    "id": "287w5kezomnj1dnt3",
                    "number": 8,
                    "name": "",
                    "channelCount": 1,
                    "connectorType": "XLR",
                    "phantomPower": false,
                    "pad": false
                }
            ],
            "outputChannels": [
                {
                    "id": "ch-mx-out1",
                    "number": 1,
                    "name": "Main L",
                    "channelCount": 1,
                    "connectorType": "XLR",
                    "phantomPower": false,
                    "pad": false
                },
                {
                    "id": "ch-mx-out2",
                    "number": 2,
                    "name": "Main R",
                    "channelCount": 1,
                    "connectorType": "XLR",
                    "phantomPower": false,
                    "pad": false
                }
            ],
            "metadata": {},
            "position": {
                "x": 130,
                "y": 440
            }
        },
        {
            "id": "dev-spk-l",
            "name": "Main L",
            "type": "Speaker",
            "model": "EV ELX",
            "inputChannels": [
                {
                    "id": "ch-spkl-in",
                    "number": 1,
                    "name": "",
                    "channelCount": 1,
                    "connectorType": "XLR",
                    "phantomPower": false,
                    "pad": false
                }
            ],
            "outputChannels": [],
            "metadata": {},
            "position": {
                "x": 450,
                "y": 480
            },
            "groupId": "grp-foh"
        },
        {
            "id": "dev-spk-r",
            "name": "Main R",
            "type": "Speaker",
            "model": "EV ELX",
            "inputChannels": [
                {
                    "id": "ch-spkr-in",
                    "number": 1,
                    "name": "",
                    "channelCount": 1,
                    "connectorType": "XLR",
                    "phantomPower": false,
                    "pad": false
                }
            ],
            "outputChannels": [],
            "metadata": {},
            "position": {
                "x": 450,
                "y": 520
            },
            "groupId": "grp-foh"
        },
        {
            "id": "dev-di-box",
            "name": "DI",
            "type": "DI Box",
            "model": "Radial AV2",
            "inputChannels": [
                {
                    "id": "ch-di-in1",
                    "number": 1,
                    "name": "",
                    "channelCount": 1,
                    "connectorType": "1/4\"",
                    "phantomPower": false,
                    "pad": false
                },
                {
                    "id": "ch-di-in2",
                    "number": 2,
                    "name": "",
                    "channelCount": 1,
                    "connectorType": "1/4\"",
                    "phantomPower": false,
                    "pad": false
                }
            ],
            "outputChannels": [
                {
                    "id": "ch-di-out1",
                    "number": 1,
                    "name": "",
                    "channelCount": 1,
                    "connectorType": "XLR",
                    "phantomPower": false,
                    "pad": false
                },
                {
                    "id": "ch-di-out2",
                    "number": 2,
                    "name": "",
                    "channelCount": 1,
                    "connectorType": "XLR",
                    "phantomPower": false,
                    "pad": false
                }
            ],
            "metadata": {
                "generalName": "DI"
            },
            "position": {
                "x": 280,
                "y": 260
            },
            "groupId": "grp-stage",
            "categoryId": "16u75f9lhmnjt4vee"
        },
        {
            "name": "Bass DI",
            "model": "Fender Bassman 800",
            "type": "Amplifier",
            "groupId": "grp-stage",
            "inputChannels": [],
            "outputChannels": [
                {
                    "id": "i48jbbhpmmnjt46lz",
                    "number": 1,
                    "name": "",
                    "channelCount": 1,
                    "connectorType": "XLR",
                    "phantomPower": false,
                    "pad": false
                }
            ],
            "metadata": {},
            "position": {
                "x": 0,
                "y": 260
            },
            "id": "ip901mze2mnjt47xk"
        }
    ],
    "connections": [
        {
            "id": "conn-1",
            "sourceDeviceId": "dev-vox1",
            "sourceChannelId": "ch-vox1-out",
            "destinationDeviceId": "dev-stagebox",
            "destinationChannelId": "ch-sb-in1"
        },
        {
            "id": "conn-2",
            "sourceDeviceId": "dev-vox2",
            "sourceChannelId": "ch-vox2-out",
            "destinationDeviceId": "dev-stagebox",
            "destinationChannelId": "ch-sb-in2"
        },
        {
            "id": "conn-3",
            "sourceDeviceId": "dev-kick",
            "sourceChannelId": "ch-kick-out",
            "destinationDeviceId": "dev-stagebox",
            "destinationChannelId": "ch-sb-in3"
        },
        {
            "id": "conn-4",
            "sourceDeviceId": "dev-snare",
            "sourceChannelId": "ch-snare-out",
            "destinationDeviceId": "dev-stagebox",
            "destinationChannelId": "ch-sb-in4"
        },
        {
            "id": "conn-5",
            "sourceDeviceId": "dev-tom",
            "sourceChannelId": "ch-tom-out",
            "destinationDeviceId": "dev-stagebox",
            "destinationChannelId": "ch-sb-in5"
        },
        {
            "id": "conn-8",
            "sourceDeviceId": "dev-stagebox",
            "sourceChannelId": "ch-sb-out1",
            "destinationDeviceId": "dev-mixer",
            "destinationChannelId": "ch-mx-in1"
        },
        {
            "id": "conn-9",
            "sourceDeviceId": "dev-mixer",
            "sourceChannelId": "ch-mx-out1",
            "destinationDeviceId": "dev-spk-l",
            "destinationChannelId": "ch-spkl-in"
        },
        {
            "id": "conn-10",
            "sourceDeviceId": "dev-mixer",
            "sourceChannelId": "ch-mx-out2",
            "destinationDeviceId": "dev-spk-r",
            "destinationChannelId": "ch-spkr-in"
        },
        {
            "id": "ozfx4lwddmnj1g35d",
            "sourceDeviceId": "dev-stagebox",
            "sourceChannelId": "qcln6oxv4mnj1e720",
            "destinationDeviceId": "dev-mixer",
            "destinationChannelId": "ax42l92lpmnj1dlwj"
        },
        {
            "id": "d63l6abcfmnj1g6mv",
            "sourceDeviceId": "dev-stagebox",
            "sourceChannelId": "tnoaq60hamnj1e7ji",
            "destinationDeviceId": "dev-mixer",
            "destinationChannelId": "9vbl54r6dmnj1dmbs"
        },
        {
            "id": "msa58qznjmnj1gath",
            "sourceDeviceId": "dev-stagebox",
            "sourceChannelId": "h1goacg0wmnj1e7sr",
            "destinationDeviceId": "dev-mixer",
            "destinationChannelId": "30pd619z7mnj1dml2"
        },
        {
            "id": "6ntpz1619mnj1gi7a",
            "sourceDeviceId": "dev-stagebox",
            "sourceChannelId": "36t23tav7mnj1e80p",
            "destinationDeviceId": "dev-mixer",
            "destinationChannelId": "lflnfc7olmnj1dmts"
        },
        {
            "id": "bvemhv83nmnj1gli2",
            "sourceDeviceId": "dev-stagebox",
            "sourceChannelId": "d5js1tov2mnj1e89e",
            "destinationDeviceId": "dev-mixer",
            "destinationChannelId": "pjzw0r8zwmnj1dn26"
        },
        {
            "id": "dj0eto9lamnj1gtia",
            "sourceDeviceId": "dev-stagebox",
            "sourceChannelId": "hjolsxki5mnj1e9y5",
            "destinationDeviceId": "dev-mixer",
            "destinationChannelId": "9ef1c7o7bmnj1dnby"
        },
        {
            "id": "38caeeq89mnj1gz4j",
            "sourceDeviceId": "dev-stagebox",
            "sourceChannelId": "wvk62zlgumnj1eaab",
            "destinationDeviceId": "dev-mixer",
            "destinationChannelId": "287w5kezomnj1dnt3"
        },
        {
            "id": "3368xg9j3mnj21q6o",
            "sourceDeviceId": "dev-keys",
            "sourceChannelId": "ch-keys-outl",
            "destinationDeviceId": "dev-di-box",
            "destinationChannelId": "ch-di-in1"
        },
        {
            "id": "087aj77g7mnj21tzt",
            "sourceDeviceId": "dev-keys",
            "sourceChannelId": "ch-keys-outr",
            "destinationDeviceId": "dev-di-box",
            "destinationChannelId": "ch-di-in2"
        },
        {
            "id": "0m30p9q75mnj21z1r",
            "sourceDeviceId": "dev-di-box",
            "sourceChannelId": "ch-di-out1",
            "destinationDeviceId": "dev-stagebox",
            "destinationChannelId": "ch-sb-in6"
        },
        {
            "id": "az28u7fdumnj222wp",
            "sourceDeviceId": "dev-di-box",
            "sourceChannelId": "ch-di-out2",
            "destinationDeviceId": "dev-stagebox",
            "destinationChannelId": "ch-sb-in7"
        },
        {
            "sourceDeviceId": "ip901mze2mnjt47xk",
            "sourceChannelId": "i48jbbhpmmnjt46lz",
            "destinationDeviceId": "dev-stagebox",
            "destinationChannelId": "hqbxbmqtjmnj22x8n",
            "id": "zcd0oxzsfmnjt6b97"
        }
    ],
    "groups": [
        {
            "id": "grp-stage",
            "name": "Stage",
            "color": "#22c55e"
        },
        {
            "id": "grp-foh",
            "name": "FOH",
            "color": "#3b82f6"
        },
        {
            "name": "Drums",
            "color": "#ef4444",
            "id": "5t3khfa0xmnjsvy79"
        },
        {
            "name": "Vocals",
            "color": "#84cc16",
            "id": "8fyedcmnemnjsw2c3"
        }
    ],
    "categories": [
        {
            "name": "Stereo",
            "color": "#3b82f6",
            "id": "16u75f9lhmnjt4vee"
        }
    ],
    "createdAt": "2026-04-03T15:03:59.747Z",
    "updatedAt": "2026-04-04T04:04:53.273Z"
};
