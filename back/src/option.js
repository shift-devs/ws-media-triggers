export const OPTION_TYPES = {
    NULL: 0,
    CHECKBOX: 1,
    NUMBER: 2,
    TEXT: 3
}

export const OPTION_BUILDER = {
    global: [
        {
            op: "GOP_TWITCH_USERNAME",
            text: "Twitch Username",
            type: OPTION_TYPES.TEXT,
            default: ""
        },
        {
            op: "GOP_STREAMLABS_TOKEN",
            text: "Streamlabs Socket API Token <a href='https://streamlabs.com/dashboard#/settings/api-settings'>(Here)</a>",
            type: OPTION_TYPES.TEXT,
            default: ""
        }
    ],
    media: [
        {
            op: "MOP_TRIGGER_ONESUB",
            text: "Trigger on Single Sub / Resub / Giftsub",
            type: OPTION_TYPES.CHECKBOX,
            default: false,
            sub: [
                {
                    op: "MOP_TRIGGER_ONESUB_NOANON",
                    text: "DON'T Trigger If Gifter Is AnAnonymousGifter",
                    type: OPTION_TYPES.CHECKBOX,
                    default: false
                }
            ]
        },
        {
            op: "MOP_TRIGGER_GIFTBOMB",
            text: "Trigger on Sub Gift Bomb",
            type: OPTION_TYPES.CHECKBOX,
            default: false,
            sub: [
                {
                    op: "MOP_TRIGGER_GIFTBOMB_NOANON",
                    text: "DON'T Trigger If Gifter Is AnAnonymousGifter",
                    type: OPTION_TYPES.CHECKBOX,
                    default: false
                },
                {
                    op: "MOP_TRIGGER_GIFTBOMB_MIN",
                    text: "Minimum Number of Subs",
                    type: OPTION_TYPES.NUMBER,
                    default: 1,
                    min: 1,
                    max: 604800
                },
                {
                    op: "MOP_TRIGGER_GIFTBOMB_MAX",
                    text: "Maximum Number of Subs (0 = NO LIMIT)",
                    type: OPTION_TYPES.NUMBER,
                    default: 0,
                    min: 0,
                    max: 604800
                }
            ]
        },
        {
            op: "MOP_TRIGGER_BITS",
            text: "Trigger on Bits",
            type: OPTION_TYPES.CHECKBOX,
            default: false,
            sub: [
                {
                    op: "MOP_TRIGGER_BITS_MIN",
                    text: "Minimum Number of Bits",
                    type: OPTION_TYPES.NUMBER,
                    default: 1,
                    min: 1,
                    max: 604800
                },
                {
                    op: "MOP_TRIGGER_BITS_MAX",
                    text: "Maximum Number of Bits (0 = NO LIMIT)",
                    type: OPTION_TYPES.NUMBER,
                    default: 0,
                    min: 0,
                    max: 604800
                }
            ]
        },
        {
            op: "MOP_TRIGGER_STREAMLABS_DONO",
            text: "Trigger on Streamlabs Donation",
            type: OPTION_TYPES.CHECKBOX,
            default: false,
            sub: [
                {
                    op: "MOP_TRIGGER_STREAMLABS_DONO_MIN",
                    text: "Minimum Dollar Amount",
                    type: OPTION_TYPES.NUMBER,
                    default: 1,
                    min: 1,
                    max: 604800
                },
                {
                    op: "MOP_TRIGGER_STREAMLABS_DONO_MAX",
                    text: "Maximum Dollar Amount (0 = NO LIMIT)",
                    type: OPTION_TYPES.NUMBER,
                    default: 0,
                    min: 0,
                    max: 604800
                }
            ]
        },
        {
            op: "MOP_TRIGGER_STREAMLABS_MERCH",
            text: "Trigger on Streamlabs Merch Purchase",
            type: OPTION_TYPES.CHECKBOX,
            default: false,
            sub: [
                {
                    op: "MOP_TRIGGER_STREAMLABS_MERCH_MIN",
                    text: "Minimum Dollar Amount",
                    type: OPTION_TYPES.NUMBER,
                    default: 1,
                    min: 1,
                    max: 604800
                },
                {
                    op: "MOP_TRIGGER_STREAMLABS_MERCH_MAX",
                    text: "Maximum Dollar Amount (0 = NO LIMIT)",
                    type: OPTION_TYPES.NUMBER,
                    default: 0,
                    min: 0,
                    max: 604800
                }
            ]
        },
        {
            op: "MOP_TRIGGER_TWITCH_CHAT",
            text: "Trigger on Twitch Chat Message",
            type: OPTION_TYPES.CHECKBOX,
            default: false,
            sub: [
                {
                    op: "MOP_TRIGGER_TWITCH_CHAT_BROADCASTER",
                    text: "Sender Must Be The Broadcaster",
                    type: OPTION_TYPES.CHECKBOX,
                    default: false,
                },
                {
                    op: "MOP_TRIGGER_TWITCH_CHAT_MOD",
                    text: "Sender Must Be The Broadcaster or Mod",
                    type: OPTION_TYPES.CHECKBOX,
                    default: false,
                },
                {
                    op: "MOP_TRIGGER_TWITCH_CHAT_VIP",
                    text: "Sender Must Be The Broadcaster, Mod or VIP",
                    type: OPTION_TYPES.CHECKBOX,
                    default: false,
                },
                {
                    op: "MOP_TRIGGER_TWITCH_CHAT_SUB",
                    text: "Sender Must Be The Broadcaster, Mod, VIP or a Sub",
                    type: OPTION_TYPES.CHECKBOX,
                    default: false
                },
                {
                    op: "MOP_TRIGGER_TWITCH_CHAT_START",
                    text: "Message Must Start With Something",
                    type: OPTION_TYPES.CHECKBOX,
                    default: false,
                    sub: [
                        {
                            op: "MOP_TRIGGER_TWITCH_CHAT_START_TEXT",
                            text: "Message Must Start With",
                            type: OPTION_TYPES.TEXT,
                            default: "",
                        },
                        {
                            op: "MOP_TRIGGER_TWITCH_CHAT_START_CASESENS",
                            text: "Case Sensitive",
                            type: OPTION_TYPES.CHECKBOX,
                            default: false
                        }
                    ]
                }
            ]
        }
    ]
}