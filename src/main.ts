/**
 * Copyright 2023 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *       http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { OPEN_AI_API_KEY, SLACK_ACCESS_TOKEN } from './constants';
import { logSheet } from './logSheet';
import { retrieveMessage } from './retrieveMessage';

export const doPost = (
  e: { postData: { getDataAsString: () => string } } | null
) => {
  // Events APIからのPOSTを取得
  // 参考→https://api.slack.com/events-api
  const json = JSON.parse(e!.postData.getDataAsString());

  // Events APIを使用する初回、URL Verificationのための記述
  if (json.type === 'url_verification') {
    return ContentService.createTextOutput(json.challenge);
  }

  const event = json.event;

  try {
    // emojiを検知した際に、それのメッセージを取得する必要がある
    if (
      event &&
      event.type === 'reaction_added' &&
      event.reaction === 'jukucho'
    ) {
      const channel = event.item.channel;
      const message = retrieveMessage(channel, event.item.ts);

      const reactions = message.reactions;
      const jukuchoReactions = reactions.filter(
        (r: { name: string }) => r.name === 'jukucho'
      );
      const jukuchoReaction = jukuchoReactions[0] || null;
      const count = jukuchoReaction ? jukuchoReaction.count : 0;

      if (count !== 1) return;

      // slackの3秒タイムアウトリトライ対策
      const cache = CacheService.getScriptCache();
      if (cache.get(event.event_ts) !== null) {
        return;
      } else {
        cache.put(event.event_ts, 'true', 600);
        sendSlackMessage(channel, message.ts, message.text);
      }
    }
  } catch (error) {
    logSheet('error:', error?.toString());
  }
};

const sendSlackMessage = (channel: string, ts: string, text: string) => {
  const url = 'https://slack.com/api/chat.postMessage';
  const token = SLACK_ACCESS_TOKEN; // Slackアクセストークン

  const aiMessage = getAiMessage(text);

  const payload = {
    channel: channel,
    text: aiMessage,
    thread_ts: ts,
  };

  const options: GoogleAppsScript.URL_Fetch.URLFetchRequestOptions = {
    method: 'post',
    contentType: 'application/json',
    headers: { Authorization: 'Bearer ' + token },
    muteHttpExceptions: true,
    payload: JSON.stringify(payload),
  };

  UrlFetchApp.fetch(url, options);
};

const getAiMessage = (input: string) => {
  const prompt =
    "JukuCho, a 17-year-old programming expert from Mino-Kamo, Gifu Prefecture, Japan, offers detailed responses to programming queries while maintaining a casual communication style (タメ口). In casual conversations unrelated to programming, JukuCho responds with just a single line, keeping it brief and to the point, and avoids asking questions. This approach ensures that while JukuCho is helpful and informative on technical topics, it remains succinct and respectful in general chats, adhering to the user's preference for brevity.";

  const messages = [
    {
      role: 'system',
      content: prompt,
    },
    {
      role: 'user',
      content: input,
    },
  ];

  const openAiUrl = 'https://api.openai.com/v1/chat/completions';
  const payload = {
    model: 'gpt-4-1106-preview',
    messages: messages,
  };

  const options: GoogleAppsScript.URL_Fetch.URLFetchRequestOptions = {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload),
    headers: {
      Authorization: 'Bearer ' + OPEN_AI_API_KEY,
    },
    muteHttpExceptions: true,
  };

  try {
    const response = UrlFetchApp.fetch(openAiUrl, options);
    if (response.getResponseCode() !== 200) {
      throw new Error('Non-200 response code: ' + response.getResponseCode());
    }
    const responseData = JSON.parse(response.getContentText());
    const finalMessage = responseData.choices[0].message.content;
    return finalMessage;
  } catch (error) {
    Logger.log('Error occurred: ' + error?.toString());
    return 'エラーが発生しました。';
  }
};
