import { BaseExtractor, SearchQueryType, Track, GuildQueueHistory, ExtractorInfo, ExtractorSearchContext, ExtractorStreamable, ExtractorExecutionContext, YoutubeExtractor } from 'discord-player';
interface YoutubeExtractorInit {
    createStream?: (ext: BaseExtractor<object>, url: string) => Promise<Readable | string>;
}

declare class ZiExtractor extends BaseExtractor<YoutubeExtractorInit> {
    static identifier: "com.Ziji.discord-player.youtube-Zijiext";
    static instance: ZiExtractor | null;
    activate(): Promise<void>;
    deactivate(): Promise<void>;
    validate(query: string, type?: SearchQueryType | null | undefined): Promise<boolean>;
    handle(query: string, context: ExtractorSearchContext): Promise<ExtractorInfo>;
    _searchYouTube(query: string, context: ExtractorSearchContext): Track<any>;
    handlePlaylist(vid: Video, context: ExtractorSearchContext, pl?: Playlist): Track<any>;
    handleVideo(vid: Video, context: ExtractorSearchContext, pl?: Playlist): Track<any>;
    stream(info: Track): Promise<ExtractorStreamable>;
}


export { ZiExtractor }