# PRD v0.2

# Allergy-Aware Travel Food Assistant - PWA Web

**Tên tạm thời:** SafeBite Travel / Allergy Food Travel Assistant
**Version:** PRD v0.2
**Ngày:** 08/07/2026
**Owner:** TuNM
**Trạng thái:** Draft for review
**Platform:** Mobile-first Progressive Web App, responsive web
**Distribution:** Web URL first, installable PWA optional
**Pilot market đề xuất:** Đà Nẵng hoặc Hội An
**Pilot users:** Khách du lịch có dị ứng thực phẩm, ưu tiên English-speaking travelers
**Pilot allergens:** Peanut, shellfish, gluten/wheat

---

# 1. Product Positioning

Ứng dụng này không được định vị là:

> “AI nhìn ảnh món ăn và xác nhận món đó an toàn.”

Định vị đúng:

> “Một PWA web giúp người có dị ứng thực phẩm khi đi du lịch hiểu món địa phương, đánh giá rủi ro allergen, tìm món/quán phù hợp hơn, và giao tiếp rõ ràng với nhà hàng.”

Điểm cốt lõi là **risk reduction**, không phải **risk elimination**.

Sản phẩm luôn dùng các nhãn:

```text
Suitable / Ask First / Risky / Avoid / Unknown
```

Không dùng:

```text
Guaranteed Safe
100% Safe
Allergy-proof
```

---

# 2. Why PWA Web Instead of Native Mobile App

## 2.1 Product Rationale

PWA web phù hợp hơn cho MVP vì:

1. User có thể mở ngay bằng link, không cần vào App Store/Google Play.
2. Dễ dùng trong ngữ cảnh du lịch: khách có thể nhận link từ hotel, tour guide, QR code, blog, hoặc restaurant.
3. Một codebase có thể phục vụ mobile browser, installed PWA, tablet, desktop, admin-lite view.
4. Deploy/update nhanh hơn native app.
5. Có thể hỗ trợ offline cơ bản cho allergy card, saved dish guide, và last viewed restaurant.
6. Dễ thử nghiệm SEO/content cho city allergy guide.

PWA là web app dùng công nghệ web nhưng có trải nghiệm giống app native hơn, có thể install và chạy standalone khi được cấu hình đúng.

## 2.2 Product Trade-offs

PWA không thay thế hoàn toàn native app.

Các giới hạn cần chấp nhận:

1. Install flow khó hơn native app vì user phải Add to Home Screen hoặc dùng browser install prompt.
2. Camera permission phụ thuộc browser và HTTPS.
3. Offline không đồng nghĩa “toàn bộ app chạy như native”.
4. Background jobs/push notification không được coi là MVP-critical.
5. Một số behavior khác nhau giữa iOS Safari, Android Chrome, desktop browsers.

---

# 3. Problem Statement

Người bị dị ứng thực phẩm khi đi du lịch thường gặp các vấn đề sau:

1. Không hiểu món ăn địa phương gồm những thành phần gì.
2. Không biết món nào thường chứa allergen ẩn như đậu phộng, hải sản, sữa, trứng, gluten, vừng.
3. Không biết cách hỏi nhà hàng bằng ngôn ngữ địa phương.
4. Không biết quán nào có khả năng hỗ trợ allergy tốt hơn.
5. Không thể tin hoàn toàn vào ảnh món ăn, review, hoặc mô tả menu ngắn.
6. Mất nhiều thời gian để ra quyết định ăn gì, đặc biệt khi đi cùng nhóm.
7. Căng thẳng vì nếu quyết định sai, hậu quả có thể nghiêm trọng.
8. Khi đang đi ngoài đường, user cần truy cập nhanh bằng điện thoại mà không muốn cài app native.

---

# 4. Product Goal

Xây dựng một **mobile-first PWA web** giúp người có dị ứng thực phẩm khi đi du lịch có thể:

1. Mở app nhanh bằng URL hoặc installed PWA.
2. Tạo allergy profile cá nhân.
3. Xem món địa phương phù hợp hoặc rủi ro theo profile.
4. Tìm quán ăn có dữ liệu phù hợp hơn với allergy profile.
5. Scan hoặc upload menu để nhận diện món và đánh giá rủi ro.
6. Tạo question card song ngữ để hỏi nhà hàng.
7. Truy cập offline vào allergy card và dữ liệu đã lưu gần đây.
8. Gửi feedback sau bữa ăn để cải thiện dữ liệu.
9. Xem source, confidence, reason, last checked của recommendation.

---

# 5. Non-goals

Trong MVP, sản phẩm **không** làm các việc sau:

1. Không xác nhận y tế rằng món ăn chắc chắn an toàn.
2. Không thay thế tư vấn bác sĩ hoặc chuyên gia dị ứng.
3. Không scrape ảnh, review, menu từ Google Maps để tạo database riêng.
4. Không dùng ảnh Google Maps để train, validate, fine-tune, hoặc cải thiện AI model.
5. Không build food delivery.
6. Không build social network.
7. Không hỗ trợ tất cả thành phố, tất cả allergy, tất cả cuisine ngay từ đầu.
8. Không cho AI tự động gắn nhãn `verified_safe`.
9. Không phát hành native iOS/Android app trong MVP.
10. Không phụ thuộc vào push notification cho core flow.
11. Không yêu cầu user install PWA mới dùng được app.
12. Không cam kết mọi chức năng hoạt động offline hoàn toàn.

---

# 6. Target Users

## 6.1 Primary Persona: Allergy Traveler

**Tên:** Anna
**Tuổi:** 28
**Quốc tịch:** Mỹ/Úc/Châu Âu
**Bối cảnh:** Đi du lịch Việt Nam 7 ngày
**Dị ứng:** Peanut, severe

**Pain points:**

* Không biết món Việt nào có đậu phộng hoặc dầu đậu phộng.
* Không nói được tiếng Việt.
* Sợ nhân viên nhà hàng không hiểu mức độ nghiêm trọng.
* Không muốn cài thêm app chỉ để dùng trong vài ngày du lịch.
* Muốn mở nhanh bằng link từ Google, blog, khách sạn, hoặc QR code.

**Job-to-be-done:**

> Khi tôi đang ở một thành phố lạ và muốn ăn món địa phương, tôi muốn mở nhanh một web app để biết món/quán nào có khả năng phù hợp với dị ứng của tôi và biết cách hỏi nhà hàng, để tôi có thể ăn uống tự tin hơn mà không mất quá nhiều thời gian.

---

## 6.2 Secondary Persona: Travel Companion

**Tên:** Minh
**Tuổi:** 30
**Bối cảnh:** Đi cùng bạn gái bị dị ứng hải sản

**Pain points:**

* Muốn tìm quán phù hợp cho cả nhóm.
* Không biết món nào có nước mắm, tôm khô, mắm tôm, nước dùng hải sản.
* Muốn share link nhanh cho bạn đồng hành.
* Không muốn mỗi bữa ăn biến thành buổi điều tra liên ngành.

**Job-to-be-done:**

> Khi tôi đi ăn cùng người có dị ứng, tôi muốn mở link hoặc PWA để tìm nhanh vài lựa chọn phù hợp cho cả nhóm.

---

## 6.3 Secondary Persona: Restaurant Owner / Staff

**Tên:** Chủ quán địa phương
**Bối cảnh:** Có khách du lịch hỏi về allergy nhưng nhân viên trả lời không nhất quán

**Pain points:**

* Không biết cách giải thích món bằng tiếng Anh.
* Không có allergen menu.
* Không muốn chịu rủi ro khi trả lời sai.
* Muốn dùng form web đơn giản, không cần cài app.

**Job-to-be-done:**

> Khi khách hỏi về dị ứng, tôi muốn có menu/allergen information rõ ràng trên web để phục vụ tốt hơn và tránh hiểu nhầm.

---

# 7. Product Hypotheses

## H1: User problem hypothesis

Người bị dị ứng thực phẩm khi đi du lịch có nhu cầu thực sự về một công cụ giúp họ hiểu món địa phương, tìm quán phù hợp, và hỏi nhà hàng đúng cách.

## H2: PWA access hypothesis

Nếu sản phẩm có thể mở bằng URL, dùng ngay trên mobile browser, và install tùy chọn, user du lịch sẽ dễ thử hơn so với native app.

## H3: Product value hypothesis

Nếu app cung cấp allergy profile, dish risk guide, restaurant suggestion, question card, và offline allergy card, user sẽ ra quyết định nhanh hơn và tự tin hơn.

## H4: Data hypothesis

Dữ liệu đủ tốt cho MVP có thể được tạo bằng cách kết hợp:

* Dish-allergen knowledge base tự xây.
* Restaurant onboarding.
* User-uploaded menu.
* Admin-reviewed menu OCR.
* Community feedback.
* Open data cho ingredient/product reference.
* POI APIs chỉ dùng cho discovery/location.

## H5: Trust hypothesis

User sẽ tin app hơn nếu app hiển thị source, confidence, và lý do recommendation thay vì chỉ hiển thị một điểm số mơ hồ.

---

# 8. Success Metrics

## 8.1 Pilot Success Metrics

| Metric                                                | Target MVP |
| ----------------------------------------------------- | ---------: |
| Tỷ lệ user hoàn thành allergy onboarding              |      > 80% |
| Thời gian từ mở web/PWA đến tìm được món/quán phù hợp |   < 5 phút |
| Tỷ lệ user tìm thấy ít nhất 1 option phù hợp          |      > 70% |
| Tỷ lệ user dùng Question Card                         |      > 40% |
| Tỷ lệ user gửi post-meal feedback                     |      > 25% |
| User trust score sau recommendation                   |      > 4/5 |
| Repeat usage trong cùng chuyến đi                     |      > 35% |
| Số quán có dữ liệu seeded trong pilot city            |      30-50 |
| Số món địa phương có risk matrix                      |     50-100 |

## 8.2 PWA/Web Metrics

| Metric                                          |    Target MVP |
| ----------------------------------------------- | ------------: |
| Mobile onboarding completion rate               |         > 80% |
| PWA install prompt interaction rate             |         > 10% |
| Installed PWA usage among returning users       |         > 15% |
| Offline allergy card availability success       |         > 95% |
| Camera/upload menu scan success rate            |         > 80% |
| First load on 4G mobile                         |   < 3s target |
| Core flow usable on iOS Safari + Android Chrome | 100% P0 flows |
| Lighthouse PWA checklist critical issues        |    0 critical |

## 8.3 Data Quality Metrics

| Metric                                      | Target MVP |
| ------------------------------------------- | ---------: |
| % menu item được map vào dish ontology      |      > 70% |
| % AI/OCR output cần admin sửa nặng          |      < 30% |
| % restaurant records có source rõ ràng      |       100% |
| % allergy risk có evidence/reason           |       100% |
| Severe reaction reports được flag cho admin |       100% |

---

# 9. MVP Scope

## 9.1 Pilot Scope

**City:** Đà Nẵng hoặc Hội An
**Languages:** English + Vietnamese
**Allergens:** Peanut, shellfish, gluten/wheat
**Dishes:** 50-100 local dishes
**Restaurants:** 30-50 manually seeded restaurants
**Menu items:** 100-300 menu items
**Users:** 30-100 pilot users
**Platform coverage:** Mobile web first, desktop web supported, installed PWA optional

---

## 9.2 MVP Must-have Features

1. Mobile-first responsive web shell.
2. PWA manifest and install support.
3. Allergy profile onboarding.
4. Dish risk guide.
5. Restaurant list and detail.
6. Restaurant allergy-readiness score.
7. Menu item risk classification.
8. Question card generator.
9. Offline access for allergy card and last viewed question card.
10. Post-meal feedback.
11. Admin dashboard for data management.
12. Source/confidence display.
13. Safety disclaimer and risk language.
14. Browser permission handling for camera/location.

---

## 9.3 MVP Nice-to-have Features

1. Menu scan with OCR + LLM parsing.
2. Save restaurants/dishes locally.
3. City allergy guide optimized for SEO.
4. Restaurant self-onboarding form.
5. Basic map view.
6. Barcode scan for packaged products using Open Food Facts.
7. Web Push reminder for post-meal feedback, post-MVP unless easy.

---

## 9.4 Post-MVP Features

1. Dish photo scan.
2. Full restaurant portal.
3. Restaurant claim flow.
4. Verified badge system.
5. Multi-city expansion.
6. More languages: Japanese, Korean, Thai, Chinese.
7. Travel planner.
8. Family profiles.
9. B2B restaurant subscription.
10. API/POS/menu provider integrations.
11. Native wrapper only if validated by traction.
12. App Store / Play Store listing as optional distribution.

---

# 10. PWA Platform Requirements

## 10.1 Installability

The app should be installable where browser/platform supports it.

Requirements:

| ID    | Requirement                                                 | Priority |
| ----- | ----------------------------------------------------------- | -------- |
| PW-01 | App has valid web app manifest                              | P0       |
| PW-02 | App has app name, short name, icons, theme color, start URL | P0       |
| PW-03 | App supports standalone display mode                        | P0       |
| PW-04 | App shows install education UI without blocking usage       | P1       |
| PW-05 | App tracks install prompt shown/accepted/dismissed          | P1       |

Acceptance criteria:

* User can use all core flows without installing.
* Installed PWA opens into app-like shell.
* Install prompt is helpful but not annoying. Humanity deserves one small mercy.

---

## 10.2 Offline Support

PWA offline behavior should be conservative.

Requirements:

| ID    | Requirement                                                    | Priority |
| ----- | -------------------------------------------------------------- | -------- |
| OF-01 | App shell can load during poor network after first visit       | P0       |
| OF-02 | Allergy card can be accessed offline after onboarding          | P0       |
| OF-03 | Last generated question card can be accessed offline           | P0       |
| OF-04 | Saved dishes/restaurants can be shown offline with stale label | P1       |
| OF-05 | Offline feedback can be queued and synced later                | P1       |
| OF-06 | Offline state is clearly displayed to user                     | P0       |

Offline copy:

```text
You are offline.
Showing saved information only.
Please confirm with restaurant staff before ordering.
```

PWA offline support should use service worker and cache strategy. Service workers can intercept network requests and return cached responses, but they do not magically make server-side OCR/LLM work offline.

---

## 10.3 Browser Permissions

Requirements:

| ID    | Requirement                                                   | Priority |
| ----- | ------------------------------------------------------------- | -------- |
| BP-01 | App requests location only when user taps “Find food near me” | P0       |
| BP-02 | App requests camera only when user taps “Scan menu”           | P0       |
| BP-03 | App provides upload fallback if camera permission is denied   | P0       |
| BP-04 | App explains why permission is needed before browser prompt   | P1       |
| BP-05 | App handles permission denied/error states gracefully         | P0       |

Menu scan on web should support:

```text
Take photo using camera
Upload menu image
Upload PDF menu
Paste menu text manually
```

Camera access on the web relies on browser APIs such as `getUserMedia()`, requires a secure context such as HTTPS, and requires user permission.

---

## 10.4 Responsive Web UX

Breakpoints:

```text
Mobile: 360-480px
Large mobile / small tablet: 481-767px
Tablet: 768-1023px
Desktop: 1024px+
```

P0 UX target:

* Mobile browser.
* Installed mobile PWA.
* Desktop admin dashboard.
* Restaurant submission form on mobile and desktop.

Core mobile navigation:

```text
Home
Dishes
Restaurants
Scan
Allergy Card
Profile
```

Desktop navigation can use sidebar/table layouts for admin and data management.

---

# 11. User Journey

## 11.1 First-time Web Entry Flow

### Step 1: User opens URL

Entry sources:

```text
Google search
Hotel QR code
Restaurant QR code
Travel blog
Friend shared link
Direct URL
Installed PWA icon
```

Landing copy:

```text
Welcome to SafeBite Travel.
Find food options that better match your allergy profile while traveling.
No install required.
```

Primary CTA:

```text
Start allergy profile
```

Secondary CTA:

```text
Browse city dish guide
```

---

## 11.2 Allergy Onboarding Flow

### Step 1: Select Allergens

```text
What do you need to avoid?

[ ] Peanut
[ ] Tree nuts
[ ] Shellfish
[ ] Fish
[ ] Milk
[ ] Egg
[ ] Soy
[ ] Wheat / Gluten
[ ] Sesame
[ ] Other
```

### Step 2: Set Severity

```text
How severe is your allergy?

( ) Mild
( ) Moderate
( ) Severe
( ) Anaphylaxis risk
```

### Step 3: Cross-contact Sensitivity

```text
Do you need to avoid cross-contact?

( ) Yes
( ) No
( ) Not sure
```

### Step 4: Destination

```text
Where are you traveling?

Search city:
[Da Nang]
```

### Step 5: Safety Disclaimer

```text
This app helps you understand food allergy risks and ask better questions.
It cannot guarantee that a dish is safe.
Always confirm with restaurant staff before ordering.
```

User must click:

```text
I understand
```

### Step 6: Save Offline Allergy Card

After onboarding:

```text
Your allergy card is ready.
It will be saved on this device for offline access.
```

---

## 11.3 Optional PWA Install Flow

Trigger after user completes onboarding or uses question card.

```text
Add SafeBite to your home screen for faster access during your trip.
You can still use it without installing.
```

Actions:

```text
[Show install instructions]
[Maybe later]
```

Do not block the user. Blocking a hungry allergic traveler behind install friction would be product design with the emotional intelligence of a vending machine.

---

## 11.4 Main Flow: “I’m Hungry”

### Step 1: User opens web/PWA home

```text
Hi Anna.
Peanut allergy profile active.
Location: Da Nang
```

Primary CTA:

```text
Find food near me
```

Secondary CTAs:

```text
Browse local dishes
Scan or upload menu
Show allergy card
```

### Step 2: App shows restaurant list

Restaurant card:

```text
Bếp Việt A

Allergy-readiness: B
Peanut: Ask first
Verified menu: Yes
Last checked: 12 days ago

Suitable dishes: 4
Ask-first dishes: 6
Avoid: 2
```

### Step 3: User opens restaurant detail

```text
Restaurant allergy summary

Peanut:
- Some dishes contain peanut topping
- Staff confirmed selected dishes can remove peanut
- Shared cookware: unknown

Confidence: Medium
```

### Step 4: User views menu items

```text
Cơm gà
Status: Likely suitable
Reason: No peanut in known recipe or restaurant menu.
Action: Ask first due to severe allergy.

Mì Quảng
Status: Ask first
Reason: Often served with roasted peanuts.
Action: Ask whether peanut topping/oil can be removed.

Gỏi cuốn
Status: Risky
Reason: Peanut sauce is commonly served.
Action: Avoid unless sauce and prep are confirmed.
```

### Step 5: User taps “Ask Restaurant”

App generates Vietnamese card:

```text
Tôi bị dị ứng nặng với đậu phộng.

Món này có đậu phộng, dầu đậu phộng, bơ đậu phộng, hoặc sốt đậu phộng không?

Món này có dùng chung chảo, dao thớt, hoặc dầu chiên với món có đậu phộng không?

Nếu không chắc, anh/chị có thể hỏi bếp giúp tôi không?
```

The card must support:

```text
Large text mode
Copy text
Show full-screen
Offline access
English/Vietnamese toggle
```

---

## 11.5 Menu Scan / Upload Flow

### Step 1: User chooses input method

```text
Scan menu with camera
Upload menu image
Upload PDF
Paste menu text
```

### Step 2: App runs OCR + LLM parsing

```text
Menu image/PDF/text
→ OCR if needed
→ Extract menu text
→ Parse menu items
→ Map to dish ontology
→ Match allergen risk
→ Return classified results
```

### Step 3: App shows risk result

```text
Detected dishes

1. Mì Quảng gà
Peanut: Possible
Shellfish: Possible
Action: Ask first

2. Bánh xèo tôm
Shellfish: Likely contains
Peanut: Possible in dipping sauce
Action: Avoid shellfish allergy / Ask first peanut allergy

3. Cơm gà
Peanut: Unlikely
Shellfish: Unknown
Action: Ask first
```

### Rule

Menu scan result must **not** create `verified_safe` status. It can only produce:

```text
Likely suitable
Ask first
Risky
Avoid
Unknown
```

---

## 11.6 Offline Flow

When offline, app shows:

```text
Offline mode

Available:
- Allergy card
- Last question card
- Saved dishes
- Saved restaurants

Not available:
- New restaurant search
- New menu scan
- AI analysis
- Live data updates
```

Every offline recommendation must show:

```text
Saved data. Last updated: <date>.
Please confirm with restaurant staff before ordering.
```

---

# 12. Functional Requirements

## 12.1 Allergy Profile

| ID    | Requirement                                            | Priority |
| ----- | ------------------------------------------------------ | -------- |
| AP-01 | User can select one or multiple allergens              | P0       |
| AP-02 | User can set severity per allergen                     | P0       |
| AP-03 | User can set cross-contact sensitivity                 | P0       |
| AP-04 | User can add custom allergen                           | P1       |
| AP-05 | User can save profile locally before account creation  | P0       |
| AP-06 | User can create account to sync profile across devices | P1       |
| AP-07 | User can delete allergy profile data                   | P0       |

Acceptance criteria:

* User can complete profile in under 60 seconds.
* Profile works without account in MVP.
* Profile is stored securely.
* Severe allergy triggers stricter risk wording.

---

## 12.2 Dish Knowledge Base

| ID    | Requirement                              | Priority |
| ----- | ---------------------------------------- | -------- |
| DK-01 | Admin can create/edit/delete dishes      | P0       |
| DK-02 | Each dish has localized names            | P0       |
| DK-03 | Each dish has common ingredients         | P0       |
| DK-04 | Each dish has possible ingredients       | P0       |
| DK-05 | Each dish has allergen risk per allergen | P0       |
| DK-06 | Each risk has reason/evidence            | P0       |
| DK-07 | Each dish can map to regions/cities      | P1       |
| DK-08 | Each dish can have aliases/spellings     | P1       |

Dish risk levels:

```text
contains
likely_contains
possible
unlikely
unknown
```

---

## 12.3 Restaurant Database

| ID    | Requirement                                     | Priority |
| ----- | ----------------------------------------------- | -------- |
| RD-01 | Admin can create/edit/delete restaurant         | P0       |
| RD-02 | Restaurant has name, location, address, contact | P0       |
| RD-03 | Restaurant can have source metadata             | P0       |
| RD-04 | Restaurant can have menu items                  | P0       |
| RD-05 | Restaurant can have allergy-readiness score     | P0       |
| RD-06 | Restaurant has verification status              | P0       |
| RD-07 | Restaurant has last checked date                | P0       |
| RD-08 | Restaurant can be linked to external place ID   | P1       |

Source policy:

```text
manual_seed
restaurant_submitted
user_submitted
osm
google_places
foursquare
admin_verified
```

---

## 12.4 Restaurant Menu

| ID    | Requirement                                    | Priority |
| ----- | ---------------------------------------------- | -------- |
| RM-01 | Admin can add menu item manually               | P0       |
| RM-02 | Menu item can be mapped to dish ontology       | P0       |
| RM-03 | Menu item has allergen status                  | P0       |
| RM-04 | Menu item has verification source              | P0       |
| RM-05 | Menu item has last verified date               | P0       |
| RM-06 | Menu item can store ingredient notes           | P1       |
| RM-07 | Menu item can store customization options      | P1       |
| RM-08 | Menu item can store shared fryer/cookware info | P1       |

---

## 12.5 Allergy-readiness Score

Score classes:

| Class | Meaning                     |
| ----- | --------------------------- |
| A     | Verified suitable           |
| B     | Likely suitable, ask first  |
| C     | Unknown / insufficient data |
| D     | Risky                       |
| E     | Avoid                       |

Requirements:

| ID    | Requirement                              | Priority |
| ----- | ---------------------------------------- | -------- |
| AS-01 | Score generated per user allergy profile | P0       |
| AS-02 | Score includes explanation               | P0       |
| AS-03 | Score includes confidence                | P0       |
| AS-04 | Score changes based on verification age  | P1       |
| AS-05 | Severe allergy applies stricter scoring  | P1       |
| AS-06 | User report can flag score for review    | P1       |

---

## 12.6 Question Card Generator

| ID    | Requirement                                 | Priority |
| ----- | ------------------------------------------- | -------- |
| QC-01 | Generate question card from allergy profile | P0       |
| QC-02 | Support English + Vietnamese                | P0       |
| QC-03 | Include allergen aliases                    | P0       |
| QC-04 | Include cross-contact question              | P0       |
| QC-05 | Include “please check with kitchen” phrase  | P0       |
| QC-06 | Allow offline access                        | P0       |
| QC-07 | Support custom allergen                     | P1       |
| QC-08 | Support severity-specific wording           | P1       |
| QC-09 | Support full-screen mobile display          | P0       |
| QC-10 | Support copy/share text                     | P1       |

---

## 12.7 Menu Scan / Upload

| ID    | Requirement                                     | Priority |
| ----- | ----------------------------------------------- | -------- |
| MS-01 | User can take menu photo through browser camera | P1       |
| MS-02 | User can upload image                           | P0       |
| MS-03 | User can upload PDF                             | P1       |
| MS-04 | User can paste menu text manually               | P0       |
| MS-05 | System runs OCR when needed                     | P1       |
| MS-06 | System extracts dish names/descriptions/prices  | P1       |
| MS-07 | System maps detected dish to ontology           | P1       |
| MS-08 | System returns allergen risk classification     | P1       |
| MS-09 | User can save scanned result                    | P2       |
| MS-10 | Admin can review scan result                    | P2       |

Safety constraint:

```text
AI/OCR-derived data source must be:
- llm_inferred
- ocr_menu
- user_uploaded
```

It cannot produce:

```text
restaurant_verified
verified_safe
```

---

## 12.8 Post-meal Feedback

| ID    | Requirement                                     | Priority |
| ----- | ----------------------------------------------- | -------- |
| PF-01 | User can confirm whether they ate at restaurant | P0       |
| PF-02 | User can select dish eaten                      | P0       |
| PF-03 | User can state whether they asked staff         | P0       |
| PF-04 | User can record restaurant answer               | P0       |
| PF-05 | User can report reaction severity               | P0       |
| PF-06 | Severe reaction report flags admin              | P0       |
| PF-07 | Report influences confidence score              | P1       |
| PF-08 | Report decays over time                         | P1       |
| PF-09 | Offline feedback can be queued and synced       | P1       |

---

## 12.9 Admin Dashboard

| ID    | Requirement                                     | Priority |
| ----- | ----------------------------------------------- | -------- |
| AD-01 | Admin can manage allergens                      | P0       |
| AD-02 | Admin can manage dish ontology                  | P0       |
| AD-03 | Admin can manage dish-allergen risks            | P0       |
| AD-04 | Admin can manage restaurants                    | P0       |
| AD-05 | Admin can manage restaurant menu                | P0       |
| AD-06 | Admin can review user reports                   | P0       |
| AD-07 | Admin can review OCR/LLM parsed menu            | P1       |
| AD-08 | Admin can manage verification status            | P1       |
| AD-09 | Admin can audit source history                  | P1       |
| AD-10 | Admin dashboard is desktop-first responsive web | P0       |

---

## 12.10 Restaurant Submission Web Form

| ID    | Requirement                                     | Priority |
| ----- | ----------------------------------------------- | -------- |
| RO-01 | Restaurant can submit info through web form     | P1       |
| RO-02 | Restaurant can upload menu photo/PDF            | P1       |
| RO-03 | Restaurant can fill allergen info per item      | P1       |
| RO-04 | Submission goes to admin review queue           | P1       |
| RO-05 | Restaurant receives shareable allergy menu link | P2       |

---

# 13. Data Source Strategy

## 13.1 Principle

Third-party APIs should be used mainly for **discovery**, while allergy intelligence should be built inside your own database.

```text
Third-party POI API = where restaurants are
Your DB = what allergy risk means
Restaurant/User/Admin input = trust layer
LLM = parsing, translation, explanation
```

## 13.2 Source Table

| Source                            | Role in App                                      | MVP Usage |
| --------------------------------- | ------------------------------------------------ | --------- |
| Restaurant onboarding             | Verified menu/allergen data                      | P0/P1     |
| User-uploaded menu                | Menu extraction and risk analysis                | P0/P1     |
| Admin manual seed                 | Initial dish/restaurant data                     | P0        |
| OpenStreetMap                     | Restaurant discovery, cuisine, website/menu tags | P0/P1     |
| Google Places                     | Nearby search, place details, map/location       | P1        |
| Foursquare Places                 | POI discovery alternative                        | P1/P2     |
| Open Food Facts                   | Packaged food, ingredients, allergens, barcode   | P1        |
| USDA FoodData Central             | Food composition/taxonomy/nutrition reference    | P1        |
| Google Business Profile FoodMenus | Reference schema / possible B2B sync later       | P2        |
| Wolt/POS APIs                     | Menu sync via partners                           | Future    |

---

# 14. Data Model Draft

## 14.1 User Allergy Profile

```json
{
  "user_id": "user_001",
  "active_profile_id": "profile_001",
  "storage_mode": "local_first",
  "profiles": [
    {
      "profile_id": "profile_001",
      "name": "Anna",
      "allergies": [
        {
          "allergen_id": "peanut",
          "severity": "anaphylaxis_risk",
          "cross_contact_sensitive": true
        }
      ],
      "language": "en",
      "destination_city": "da_nang",
      "offline_enabled": true
    }
  ]
}
```

## 14.2 PWA Local Cache Metadata

```json
{
  "cache_id": "cache_001",
  "user_id": "user_001",
  "device_id": "browser_device_001",
  "cached_resources": [
    "allergy_card",
    "last_question_card",
    "saved_dishes",
    "saved_restaurants"
  ],
  "last_synced_at": "2026-07-08T10:00:00Z",
  "expires_at": "2026-07-15T10:00:00Z"
}
```

## 14.3 Restaurant

```json
{
  "restaurant_id": "rest_001",
  "name": "Bếp Việt A",
  "city": "da_nang",
  "address": "123 Example Street",
  "lat": 16.047,
  "lng": 108.206,
  "source": "manual_seed",
  "external_ids": {
    "osm_id": "node/123",
    "google_place_id": null,
    "foursquare_id": null
  },
  "verification_status": "admin_verified",
  "last_checked_at": "2026-07-03"
}
```

## 14.4 Restaurant Menu Item

```json
{
  "menu_item_id": "item_001",
  "restaurant_id": "rest_001",
  "dish_id": "mi_quang",
  "name": "Mì Quảng gà",
  "description": "Chicken turmeric noodles with herbs",
  "price": 65000,
  "currency": "VND",
  "allergen_status": [
    {
      "allergen_id": "peanut",
      "status": "may_contain",
      "confidence": 0.8,
      "source": "restaurant_submitted",
      "reason": "Peanut topping can be added by default unless removed."
    }
  ],
  "shared_cookware": "unknown",
  "shared_fryer": "not_applicable",
  "can_customize": true,
  "last_verified_at": "2026-07-03"
}
```

---

# 15. Recommendation Logic

## 15.1 Input

```json
{
  "user_profile": {
    "allergies": [
      {
        "allergen_id": "peanut",
        "severity": "anaphylaxis_risk",
        "cross_contact_sensitive": true
      }
    ]
  },
  "city": "da_nang",
  "restaurant_id": "rest_001",
  "client_context": {
    "platform": "pwa_web",
    "online": true,
    "installed": false
  }
}
```

## 15.2 Output

```json
{
  "restaurant_id": "rest_001",
  "allergy_readiness": "B",
  "confidence": "medium",
  "summary": "Some suitable dishes, but user should ask before ordering due to severe peanut allergy.",
  "offline_cacheable": true,
  "menu_recommendations": [
    {
      "menu_item_id": "item_001",
      "name": "Cơm gà",
      "status": "ask_first",
      "risk_level": "unlikely",
      "reason": "No known peanut ingredients, but cross-contact is unknown."
    }
  ]
}
```

## 15.3 Classification Rules

| Condition                                                          | Output                                    |
| ------------------------------------------------------------------ | ----------------------------------------- |
| Restaurant verified no allergen + no cross-contact concern         | Suitable                                  |
| Dish unlikely to contain allergen but restaurant not verified      | Ask first                                 |
| Dish may contain allergen                                          | Ask first / Risky                         |
| Dish likely contains allergen                                      | Avoid                                     |
| Unknown ingredient + severe allergy                                | Ask first / Unknown                       |
| Shared fryer/cookware confirmed + severe cross-contact sensitivity | Avoid or Risky                            |
| LLM-only evidence                                                  | Never higher than Ask first               |
| Offline cached data older than threshold                           | Downgrade confidence / show stale warning |

---

# 16. UX Requirements

## 16.1 Tone

The app must be:

* Clear.
* Calm.
* Conservative.
* Transparent.
* Non-alarmist.
* Non-overconfident.

Bad wording:

```text
This dish is safe.
```

Good wording:

```text
This dish looks lower risk for your profile, but please confirm with staff before ordering.
```

---

## 16.2 Mobile-first UX

P0 screens must be optimized for one-hand mobile use:

1. Home.
2. Allergy onboarding.
3. Allergy card.
4. Dish guide.
5. Restaurant list.
6. Restaurant detail.
7. Question card.
8. Menu upload/scan.
9. Feedback.

Each critical action should be reachable without dense tables, tiny links, or desktop-only interactions. Yes, apparently we must still say this in 2026.

---

## 16.3 Recommendation Card

Each card should show:

```text
Dish name
Status: Suitable / Ask first / Risky / Avoid / Unknown
Allergen risk
Confidence
Reason
Action
Source
Last checked
Offline/stale status if applicable
```

---

## 16.4 Restaurant Card

Each restaurant card should show:

```text
Restaurant name
Distance
Cuisine
Allergy-readiness class
Number of suitable dishes
Number of ask-first dishes
Number of avoid dishes
Verification status
Last checked
```

---

## 16.5 PWA Install Education

Install prompt should appear only after meaningful user action:

Good triggers:

```text
After onboarding complete
After user opens question card twice
After user saves a restaurant
After second session
```

Bad triggers:

```text
Immediately on first page load
Before user understands product
Blocking core actions
```

---

# 17. Admin Workflow

## 17.1 Seed Dish

Admin creates dish:

1. Add dish name.
2. Add aliases.
3. Add region/cuisine.
4. Add common ingredients.
5. Add possible ingredients.
6. Add allergen risk matrix.
7. Add reason/evidence.
8. Publish.

## 17.2 Seed Restaurant

Admin creates restaurant:

1. Add name/address/location.
2. Add source.
3. Add cuisine.
4. Add menu items.
5. Map menu items to dish ontology.
6. Add allergen info if known.
7. Mark status as `manual_seed` or `admin_verified`.

## 17.3 Review User Report

If user reports reaction:

1. Report appears in priority queue.
2. Admin checks restaurant/dish/allergen.
3. Admin can downgrade confidence.
4. Admin can flag restaurant.
5. Admin can request re-verification.
6. Admin can hide recommendation temporarily.

---

# 18. AI/LLM Usage Policy

## 18.1 Allowed AI Tasks

AI can:

1. Parse OCR text into menu items.
2. Translate dish names/descriptions.
3. Map dish aliases to known dishes.
4. Suggest possible allergen risks.
5. Generate question card.
6. Summarize restaurant response.
7. Detect uncertainty.

## 18.2 Disallowed AI Tasks

AI must not:

1. Mark food as `verified_safe`.
2. Override restaurant/admin verification.
3. Hide uncertainty.
4. Infer ingredients from restricted third-party images.
5. Store LLM guesses as facts without source label.
6. Recommend severe allergy users eat without asking staff.
7. Treat offline cached result as fresh verified data.

## 18.3 AI Output Schema

```json
{
  "detected_item": "Mì Quảng gà",
  "matched_dish_id": "mi_quang",
  "match_confidence": 0.82,
  "allergen_risks": [
    {
      "allergen_id": "peanut",
      "risk_level": "possible",
      "confidence": 0.74,
      "reason": "Mì Quảng is often served with roasted peanuts.",
      "source": "llm_inferred"
    }
  ],
  "recommended_action": "ask_first"
}
```

---

# 19. Safety & Trust Requirements

## 19.1 Mandatory Safety Copy

On onboarding:

```text
This app helps you understand possible allergy risks.
It cannot guarantee food safety.
Always confirm ingredients and preparation with restaurant staff before ordering.
```

On AI/menu scan result:

```text
This result is based on menu/image analysis and may be incomplete.
Hidden ingredients and cross-contact may not be detected.
Please ask the restaurant before ordering.
```

On severe allergy profile:

```text
Because your allergy is severe, only restaurant-verified information should be treated as higher confidence.
When in doubt, avoid or ask staff directly.
```

On offline result:

```text
You are viewing saved information.
Restaurant menus and preparation methods may have changed.
Please confirm with staff before ordering.
```

## 19.2 Trust Display

Each recommendation must include:

* Source.
* Confidence.
* Last checked.
* Reason.
* Suggested action.
* Online/offline status.
* Stale data warning if applicable.

## 19.3 Severe Reaction Handling

If user reports severe reaction:

1. Immediately flag restaurant/dish.
2. Reduce confidence.
3. Hide “suitable” recommendation for matching allergen until review.
4. Notify admin.
5. Ask user whether emergency help is needed only as a UX shortcut, not medical advice.

---

# 20. Legal & Data Compliance Notes

## 20.1 Google Maps / Places

Allowed direction:

```text
Use Google Places for discovery/location/display with proper attribution and billing.
```

Avoided direction:

```text
Scrape/cache/store Google Maps photos/reviews/business data to build internal allergy database.
```

## 20.2 OpenStreetMap

OSM can be used for restaurant discovery and map display if attribution and license obligations are handled correctly.

## 20.3 Open Food Facts

Open Food Facts can support packaged food/barcode and ingredient/allergen vocabulary, but user-contributed data should be treated as non-guaranteed and displayed with source/confidence.

## 20.4 User Data

User allergy profile is health-adjacent sensitive data.

Requirements:

```text
Collect minimum necessary data
Encrypt sensitive data at rest
Use HTTPS
Provide delete/export controls
Avoid unnecessary third-party tracking
Do not expose allergy profile in analytics payloads
Do not store allergy profile in URL query params
```

## 20.5 PWA Privacy

Because PWA uses browser storage, the app must:

1. Explain what is saved offline.
2. Let user clear local saved data.
3. Avoid storing unnecessary medical details locally.
4. Handle shared devices carefully.
5. Avoid caching private API responses without strategy.

---

# 21. Technical Scope

## 21.1 Suggested Stack

### Frontend PWA

```text
Next.js / React
TypeScript
Tailwind CSS
Shadcn/ui
TanStack Query
Zustand or Redux Toolkit
next-pwa / Serwist / Workbox
Web App Manifest
Service Worker
IndexedDB via Dexie
i18n
```

### Web Capabilities

```text
Responsive web
Installable PWA
Offline app shell
Offline allergy card
Browser camera/file upload
Geolocation API
Clipboard/share fallback
Optional Web Push post-MVP
```

### Backend

```text
FastAPI or NestJS
PostgreSQL
PostGIS
Redis optional
Object storage for menu images/PDFs
Background worker for OCR/LLM jobs
API rate limiting
Auth/session management
```

### Admin

```text
Next.js
Shadcn/ui
TanStack Table
Role-based access
Audit log
Review queue
```

### AI/OCR

```text
OCR provider
LLM structured output
Prompt versioning
Output validation
Admin review queue
```

---

## 21.2 Core Services

```text
User Service
Allergy Profile Service
Dish Knowledge Service
Restaurant Service
Menu Service
Recommendation Service
Question Card Service
Feedback Service
AI Parsing Service
Admin Service
PWA Cache/Sync Service
```

---

## 21.3 Client Storage

Suggested storage:

```text
localStorage:
- UI preferences
- onboarding state only if non-sensitive

IndexedDB:
- allergy card
- last question card
- saved dishes/restaurants
- offline feedback queue

HTTP cache / service worker cache:
- app shell
- static assets
- public city guide pages
```

Do not store:

```text
Access tokens in localStorage
Sensitive profile data in URL
Unencrypted private API responses without clear policy
Google Maps restricted content for internal reuse
```

---

# 22. API Draft

## 22.1 Create Allergy Profile

```http
POST /api/v1/profiles
```

```json
{
  "name": "Anna",
  "allergies": [
    {
      "allergen_id": "peanut",
      "severity": "anaphylaxis_risk",
      "cross_contact_sensitive": true
    }
  ],
  "language": "en",
  "client_platform": "pwa_web"
}
```

## 22.2 Get Dish Recommendations

```http
GET /api/v1/recommendations/dishes?city=da_nang&profile_id=profile_001
```

## 22.3 Get Restaurants

```http
GET /api/v1/restaurants?city=da_nang&profile_id=profile_001
```

## 22.4 Generate Question Card

```http
POST /api/v1/question-cards
```

```json
{
  "profile_id": "profile_001",
  "dish_id": "mi_quang",
  "restaurant_id": "rest_001",
  "target_language": "vi",
  "offline_cache": true
}
```

## 22.5 Submit Feedback

```http
POST /api/v1/feedback
```

```json
{
  "restaurant_id": "rest_001",
  "menu_item_id": "item_001",
  "allergen_id": "peanut",
  "asked_restaurant": true,
  "reaction": "none",
  "visited_at": "2026-07-03",
  "client_platform": "pwa_web"
}
```

## 22.6 Upload Menu

```http
POST /api/v1/menu-scans
Content-Type: multipart/form-data
```

Fields:

```text
restaurant_id optional
city
profile_id
file image/pdf optional
raw_text optional
source=user_uploaded
```

## 22.7 Get PWA Client Config

```http
GET /api/v1/client-config
```

Response:

```json
{
  "supported_cities": ["da_nang", "hoi_an"],
  "supported_languages": ["en", "vi"],
  "offline_cache_ttl_days": 7,
  "menu_upload_max_mb": 10,
  "pwa_install_enabled": true
}
```

---

# 23. Rollout Plan

## Phase 0: Discovery

**Goal:** Validate problem, scope, and PWA-first direction.

Deliverables:

* 5-10 user interviews.
* 1 city selected.
* 3 allergens selected.
* 50 dishes selected.
* 30 restaurants shortlisted.
* Initial risk matrix.
* PWA browser support matrix.
* Web entry/channel assumptions: QR, SEO, shared link, hotel/tour partner.

Exit criteria:

* Clear pilot persona.
* Clear city/allergy scope.
* Initial PWA user flow approved.
* P0 browser list approved.

---

## Phase 1: PWA Dish Guide MVP

**Goal:** Let user open web app, create allergy profile, browse local dish risk, and access question card.

Deliverables:

* Mobile-first web shell.
* PWA manifest.
* Service worker baseline.
* Allergy onboarding.
* Dish knowledge base.
* Risk matrix.
* Dish recommendation.
* Question card.
* Offline allergy card.
* Basic admin CRUD.

Exit criteria:

* User can open URL and complete onboarding.
* User can see recommended/ask-first/avoid dishes.
* Every dish risk has reason/evidence.
* Question card works in English/Vietnamese.
* Allergy card is available offline after first setup.

---

## Phase 2: Restaurant MVP

**Goal:** Turn dish guidance into actionable restaurant decisions.

Deliverables:

* Restaurant database.
* Restaurant menu items.
* Restaurant allergy-readiness score.
* Restaurant list/detail.
* Location permission flow.
* Basic responsive map/list view.
* Admin restaurant/menu management.

Exit criteria:

* 30-50 restaurants available.
* User can find restaurant options by allergy profile.
* Menu items classified by risk.
* Location denied state still allows city-based browsing.

---

## Phase 3: Feedback Loop

**Goal:** Improve trust through structured user reports.

Deliverables:

* Post-meal feedback flow.
* Admin report queue.
* Confidence adjustment logic.
* Severe reaction flagging.
* Optional offline feedback queue.

Exit criteria:

* User can submit meal reports.
* Severe reaction report flags admin.
* Reports affect confidence without blindly overriding verified data.

---

## Phase 4: Menu Upload / Scan

**Goal:** Provide value when restaurant data is missing.

Deliverables:

* Menu image upload.
* Camera capture where supported.
* PDF/text input fallback.
* OCR.
* LLM menu parser.
* Dish matching.
* Risk result UI.
* Admin review for parsed menus.

Exit criteria:

* User can upload or capture menu and get risk classification.
* AI results always show uncertainty/source.
* AI never marks scanned menu items as verified safe.
* Permission denied state has upload/manual fallback.

---

## Phase 5: Restaurant Onboarding Web

**Goal:** Build scalable verified data pipeline.

Deliverables:

* Restaurant submission form.
* Menu/allergen editor.
* Verification status.
* Last checked date.
* Basic verified badge.
* Shareable restaurant allergy page.

Exit criteria:

* 5-10 restaurants submit data directly.
* Admin can approve/reject submissions.
* App displays restaurant-submitted allergy information.

---

# 24. Monetization Hypotheses

## B2C

Possible products:

* Trip pass.
* Premium city allergy guide.
* Offline allergy card.
* Family profiles.
* Saved itinerary.
* Multi-language phrasebook.

## B2B

Possible products:

* Restaurant verified badge.
* Allergy-aware menu QR.
* Multilingual allergen menu.
* Listing boost.
* Menu translation.
* Restaurant analytics.
* Staff training material.

## Partnership

Possible partners:

* Hotels.
* Tour agencies.
* Travel insurance.
* Allergy clinics.
* Expat communities.
* Restaurant associations.

PWA makes QR/link-based distribution especially useful for hotels, restaurants, and travel partners.

---

# 25. Risks & Mitigations

## 25.1 Safety Risk

**Risk:** User relies too much on app and has allergic reaction.

**Mitigation:**

* No guaranteed safe language.
* Always show ask-first action.
* Severe allergy stricter logic.
* Source/confidence visible.
* Cross-contact questions included.
* Severe reaction reports escalated.

---

## 25.2 Data Quality Risk

**Risk:** Ingredient/menu data outdated or wrong.

**Mitigation:**

* Last verified date.
* Verification expiry.
* Admin review.
* User feedback.
* Confidence decay.
* Source tracking.
* Offline stale-data warning.

---

## 25.3 Legal/Data Source Risk

**Risk:** Product violates third-party platform terms.

**Mitigation:**

* Do not scrape Google Maps.
* Use official APIs only.
* Separate discovery data from allergy database.
* Prefer restaurant/user/admin submitted data.
* Maintain attribution for OSM/Google where required.

---

## 25.4 AI Hallucination Risk

**Risk:** LLM invents ingredients or underestimates allergen risk.

**Mitigation:**

* Structured output schema.
* Confidence score.
* Evidence/source label.
* Conservative default.
* Admin review for persistent data.
* LLM-only output cannot become verified.

---

## 25.5 Cold Start Risk

**Risk:** App feels empty without enough restaurants.

**Mitigation:**

* Start with dish-level city guide.
* Manually seed 30-50 restaurants.
* Add menu upload/scan.
* Add user feedback.
* Add restaurant onboarding.

---

## 25.6 PWA Install Friction Risk

**Risk:** User does not know how to install PWA.

**Mitigation:**

* Do not require install for MVP.
* Show install education after value moment.
* Keep core flow URL-first.
* Use QR and share links.
* Treat installed PWA as retention improvement, not onboarding requirement.

---

## 25.7 Browser Compatibility Risk

**Risk:** Camera, offline, install, or push behavior differs across browsers.

**Mitigation:**

* Define P0 browser support.
* Provide upload fallback for camera.
* Provide manual text fallback for OCR.
* Keep push notification out of MVP-critical flow.
* Test on iOS Safari and Android Chrome before pilot.

---

## 25.8 Offline Misunderstanding Risk

**Risk:** User thinks offline data is fresh and verified.

**Mitigation:**

* Show offline badge.
* Show last updated date.
* Downgrade confidence when data is stale.
* Keep safety copy visible.
* Require online mode for fresh recommendation/search.

---

# 26. Open Questions

1. Pilot city: Đà Nẵng hay Hội An?
2. Primary user: foreign tourists hay Vietnamese domestic travelers?
3. First allergen: peanut hay shellfish?
4. Có làm map ngay từ MVP không, hay list trước?
5. Menu upload/scan vào MVP v0.1 web không, hay để phase 4?
6. Restaurant onboarding dùng Google Form/admin nhập tay trước, hay build form web nhỏ?
7. Mức độ medical/legal disclaimer cần review bởi ai?
8. Allergy profile MVP nên local-first hay bắt buộc account?
9. Offline cache giữ trong bao lâu?
10. Có cần SEO city guide ngay từ phase 1 không?
11. Có cần Web Push cho feedback reminder không, hay để post-MVP?
12. Ai sẽ verify dish knowledge base ban đầu?

---

# 27. Recommended MVP Build Order

```text
1. PWA web shell
2. Web app manifest
3. Service worker baseline
4. Allergy profile
5. Offline allergy card
6. Dish ontology
7. Dish-allergen risk matrix
8. Question card
9. Dish recommendation
10. Restaurant database
11. Restaurant menu/risk
12. Allergy-readiness score
13. Post-meal feedback
14. Admin dashboard
15. Menu upload/scan
16. Restaurant onboarding web form
```

Không nên build đầu tiên:

```text
Native iOS/Android app
Google Maps photo ingestion
Dish photo scan
Full restaurant portal
Payment system
Complex social features
Multi-city support
Push-notification-heavy workflow
```

---

# 28. Final Product Direction

Sản phẩm này nên trở thành:

> **Một mobile-first PWA travel food assistant cho người có dị ứng thực phẩm, tập trung vào local dish knowledge, restaurant verification, question cards, menu parsing, trust scoring, và URL-first access.**

Moat dài hạn không phải là “AI nhìn ảnh món ăn”.

Moat dài hạn là:

1. Local dish-allergen knowledge base.
2. Verified restaurant allergy data.
3. Structured community reports.
4. Confidence/risk scoring.
5. Multilingual allergy communication.
6. Travel-specific web UX.
7. QR/share/link distribution.
8. Restaurant-side data acquisition.

PWA là chiến lược phân phối và UX, không phải bản chất sản phẩm. Bản chất sản phẩm vẫn là **trust + local knowledge + workflow đúng lúc user cần ăn**.
