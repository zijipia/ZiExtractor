import { BaseExtractor, SearchQueryType, Track, GuildQueueHistory, ExtractorInfo, ExtractorSearchContext, ExtractorStreamable, ExtractorExecutionContext } from 'discord-player';
import Innertube from 'youtubei.js';

declare class ZiExtractor extends BaseExtractor<YoutubeExtractorInit> {
    static identifier = "com.Ziji.discord-player.youtube-Zijiext";
    static instance: ZiExtractor | null;
    innerTube: Innertube;
    activate(): Promise<void>;
    deactivate(): Promise<void>;
    validate(query: string, type?: SearchQueryType | null | undefined): Promise<boolean>;
    bridge(track: Track, sourceExtractor: BaseExtractor | null): Promise<ExtractorStreamable | null>;
    handle(query: string, context: ExtractorSearchContext): Promise<ExtractorInfo>;
    private _searchYouTube;
    private handlePlaylist;
    private handleVideo;
    getRelatedTracks(track: Track, history: GuildQueueHistory): Promise<ExtractorInfo>;
    stream(info: Track): Promise<ExtractorStreamable>;
    emptyResponse(): ExtractorInfo;
}


export { ZiExtractor }