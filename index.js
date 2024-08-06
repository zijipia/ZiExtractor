const { BaseExtractor, QueryType, Track } = require("discord-player");
const { getLinkPreview } = require("link-preview-js");
const { searchYouTube, handlePlaylist, handleVideo } = require("./Handler");

async function getStream(query, _) {
    try {
        const resp = await fetch("https://api.cobalt.tools/api/json", {
            headers: {
                accept: "application/json",
                "content-type": "application/json",
            },
            body: JSON.stringify({ url: query.url, isAudioOnly: true }),
            method: "POST",
        });
        const data = await resp.json();
        return data.url;
    } catch (error) {
        console.error(`Error in getStream: ${error.message}`);
        return null;
    }
}

class ZiExtractor extends BaseExtractor {
    static identifier = "com.Ziji.discord-player.youtube-Zijiext";
    static instance;

    async activate() {
        this.protocols = [
            "https",
            "bilibili",
            "dailymotion",
            "facebook",
            "instagram",
            "pinterest",
            "soundcloud",
            "streamable",
            "tiktok",
            "tumblr",
            "twitch",
            "twitter",
            "vimeo",
            "youtube",
        ];
        this._stream = this.options.createStream || ((query) => getStream(query, null));
        ZiExtractor.instance = this;
    }

    async deactivate() {
        this.protocols = [];
        ZiExtractor.instance = null;
    }

    async validate(query, type) {
        return typeof query === "string" && [
            QueryType.AUTO,
            QueryType.AUTO_SEARCH,
            QueryType.YOUTUBE,
            QueryType.YOUTUBE_SEARCH,
            QueryType.YOUTUBE_PLAYLIST,
            QueryType.YOUTUBE_VIDEO,
            QueryType.ARBITRARY,
        ].includes(type);
    }

    async handle(query, context) {
        query = query.includes("youtube.com") ? query.replace(/(m(usic)?|gaming)\./, "") : query;
        if (context.type === QueryType.YOUTUBE_PLAYLIST) return handlePlaylist(query, context, this);
        if ([QueryType.YOUTUBE_VIDEO, QueryType.YOUTUBE].includes(context.type)) return handleVideo(query, context, this);
        if ([QueryType.ARBITRARY].includes(context.type)) {
            try {
                const data = await getLinkPreview(`https:${query}`, {
                    timeout: 1000,
                });
                const track = new Track(this.context.player, {
                    title: data?.title ?? query,
                    author: data.title,
                    description: query,
                    url: data.url,
                    requestedBy: context.requestedBy,
                    thumbnail: data.images?.at(0) ?? data.favicons?.at(0) ?? "https://raw.githubusercontent.com/zijipia/zijipia/main/Assets/image.png",
                    source: "ARBITRARY",
                    raw: data,
                    queryType: context.type,
                    metadata: data,
                    async requestMetadata() {
                        return data;
                    },
                });

                track.extractor = this;
                return { playlist: null, tracks: [track] };
            } catch (error) {
                console.error(`Error in handleVideo: ${error.message}`);
                return this.emptyResponse();
            }
        }
        const tracks = await searchYouTube(query, context);
        return { playlist: null, tracks };
    }

    async getRelatedTracks(track, history) {
        let info = void 0;
        info = await YouTubeSR.YouTube.search(track?.author || track.title, { limit: 5, type: "video" }).then((x) => x).catch(Util.noop);
        if (!info?.length) {
            return this.createResponse();
        }
        const unique = info.filter((t) => !history.tracks.some((x) => x.url === t.url));
        const similar = (unique.length > 0 ? unique : info).map((video) => {
            const t = new Track(this.context.player, {
                title: video.title,
                url: `https://www.youtube.com/watch?v=${video.id}`,
                duration: video.durationFormatted || Util.buildTimeCode(Util.parseMS(video.duration * 1e3)),
                description: video.title,
                thumbnail: typeof video.thumbnail === "string" ? video.thumbnail : video.thumbnail.url,
                views: video.views,
                author: video.channel.name,
                requestedBy: track.requestedBy,
                source: "youtube",
                queryType: "youtubeVideo",
                metadata: video,
                async requestMetadata() {
                    return video;
                }
            });
            t.extractor = this;
            return t;
        });
        return this.createResponse(null, similar);
    }

    stream(info) {
        return this._stream(info, this);
    }

    emptyResponse() {
        return { playlist: null, tracks: [] };
    }
}

module.exports = { ZiExtractor };
