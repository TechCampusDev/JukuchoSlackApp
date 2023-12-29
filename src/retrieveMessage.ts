import { SLACK_ACCESS_TOKEN } from './constants';

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
export function retrieveMessage(channel: any, ts: any) {
  const url = 'https://slack.com/api/conversations.history';
  const token = SLACK_ACCESS_TOKEN; // Slackアクセストークン

  const payload = {
    channel: channel,
    latest: ts,
    limit: 1,
    inclusive: true,
  };

  const options: any = {
    method: 'get',
    contentType: 'application/json',
    headers: { Authorization: 'Bearer ' + token },
    muteHttpExceptions: true,
    payload: JSON.stringify(payload),
  };

  const response = UrlFetchApp.fetch(url, options);

  var content = response.getContentText();

  const jsonObject = JSON.parse(content);

  return jsonObject.messages[0];
}
