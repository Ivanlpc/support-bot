import { ColorResolvable, EmbedBuilder, ActionRowBuilder, SelectMenuBuilder, APIActionRowComponent } from "discord.js";
import config from '../config';


export function selectLanguageEmbed(){
    return {
    embed: new EmbedBuilder()
    .setTitle(config.translate.select_language_embed.title)
    .setDescription(config.translate.select_language_embed.description)
    .setColor(config.translate.select_language_embed.color as ColorResolvable),
    
    selector:  {
        "type": 1,
        "components": [
            {
                "type": 3,
                "custom_id": "lang_selector",
                "options":[
                    {
                        "label": "Spanish",
                        "value": "es",
                        "description": "",
                        "emoji": {
                            "name": "🇪🇦"
                        }
                    },
                    {
                        "label": "English",
                        "value": "en",
                        "description": "",
                        "emoji": {
                            "name": "🇺🇲"
                            
                        }
                    },
                    {
                        "label": "Other",
                        "value": "other",
                        "description": "",
                        "emoji": {
                            "name": "❓"
                            
                        }
                    },
                    {
                        "label": "Cancel",
                        "value": "cancel",
                        "description": "",
                        "emoji": {
                            "name": "❌"
                            
                        }
                    }
                    ],
                "placeholder": "Languages",
                "min_values": 1,
                "max_values": 1
            }
        ]
    }}
    
}

export function language_selected(language: string) {
    return new EmbedBuilder()
    .setTitle(config.translate.language_selected_embed.title.replace('{lang}', language))
    .setColor(config.translate.language_selected_embed.color as ColorResolvable)
    .setDescription(config.translate.language_selected_embed.description)
    .setThumbnail(config.translate.language_selected_embed.thumbnail.replace('{lang}', language))
}