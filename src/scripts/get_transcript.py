import sys
import json
from youtube_transcript_api import YouTubeTranscriptApi, TranscriptsDisabled, NoTranscriptFound

def fetch_transcript(video_id, language="ko"):
    """
    유튜브 video_id와 언어코드로 자막(스크립트) 텍스트를 반환합니다.
    FetchedTranscriptSnippet 객체의 text 속성을 읽는 최신 방식.
    """
    try:
        transcript_list = None
        try:
             # Try the static method (modern versions)
             transcript_list = YouTubeTranscriptApi.list_transcripts(video_id)
        except AttributeError:
             # Fallback: Try instance method (older versions/specific environments)
             if hasattr(YouTubeTranscriptApi, 'list'):
                 transcript_list = YouTubeTranscriptApi().list(video_id)
             else:
                 return {"success": False, "error": "Method list_transcripts not found"}
        
        transcript = None
        lang_info = ""  # 기본값

        # 우선 한국어 수동 자막을 찾는다.
        try:
            transcript = transcript_list.find_transcript([language])
        except Exception:
            # 없으면 자동 생성 자막을 찾는다.
            try:
                # Try finding manual English first if Korean manual fails (Enhancement over user code)
                # But strictly following user logic structure:
                transcript = transcript_list.find_generated_transcript([language])
            except Exception:
                # 그래도 없으면 첫 번째 사용 가능한 자막 사용
                try:
                    # Fallback to English/Any if Korean failed
                    # This logic iterates and picks the first one.
                    for t in transcript_list:
                        transcript = t
                        lang_info = t.language_code
                        break
                except Exception:
                    return {"success": False, "error": "No transcript available."}

        if not transcript:
             return {"success": False, "error": "No transcript found after search."}
        
        # transcript.fetch() 결과에서 text 속성만 추출
        transcript_data = transcript.fetch()
        text_list = []
        for entry in transcript_data:
            # Handle both dict and object with text attribute
            if hasattr(entry, 'text'):
                if entry.text:
                    text_list.append(entry.text)
            elif isinstance(entry, dict) and 'text' in entry:
                text_list.append(entry['text'])
                
        full_text = ' '.join(text_list)
        return {"success": True, "transcript": full_text, "lang": lang_info or language}

    except Exception as e:
        return {"success": False, "error": str(e)}

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"success": False, "error": "Video ID required"}))
        sys.exit(1)

    video_id = sys.argv[1]
    result = fetch_transcript(video_id)
    print(json.dumps(result, ensure_ascii=False))
