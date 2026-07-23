import { PlatformConfig, ProductMapping } from '../types';

export const PLATFORM_PRESETS: { name: string; id: string; config: Omit<PlatformConfig, 'id' | 'name'> }[] = [
  {
    name: "네이버 스마트스토어",
    id: "naver_preset",
    config: {
      identifier: "주문번호",
      start_row: 2,
      col_map: {
        용량: 24, // Y (등록옵션명)
        상품명: 20, // U (노출상품명)
        수량: 26, // AA (구매수)
        수령인: 13, // N (수취인명)
        연락처: 48, // AW (수취인번호)
        우편번호: 54, // BC (우편번호)
        주소: 50, // AY (수취인주소)
        배송메시지: 55 // BD (배송메세지)
      },
      tracking_col: 8, // I열 (송장번호)
      courier_col: 7, // H열 (택배사)
      filepath_pattern: "input/스마트스토어_전체주문발주발송관리_*.xlsx"
    }
  },
  {
    name: "쿠팡",
    id: "coupang_preset",
    config: {
      identifier: "묶음배송번호",
      start_row: 1,
      col_map: {
        용량: 11, // L (등록옵션명)
        상품명: 12, // M (노출상품명)
        수량: 22, // W (구매수)
        수령인: 26, // AA (수취인명)
        연락처: 27, // AB (수취인번호)
        우편번호: 28, // AC (우편번호)
        주소: 29, // AD (수취인주소)
        배송메시지: 30 // AE (배송메세지)
      },
      tracking_col: 4,
      courier_col: 3,
      filepath_pattern: "input/DeliveryList_*.xlsx"
    }
  },
  {
    name: "토스",
    id: "toss_preset",
    config: {
      identifier: "주문배송관리",
      start_row: 3,
      col_map: {
        용량: 11, // L (등록옵션명)
        상품명: 8, // I (노출상품명)
        수량: 12, // M (구매수)
        수령인: 17, // R (수취인명)
        연락처: 18, // S (수취인번호)
        우편번호: 20, // U (우편번호)
        주소: 19, // T (수취인주소)
        배송메시지: 21 // V (배송메세지)
      },
      tracking_col: 6,
      courier_col: 5,
      filepath_pattern: "input/주문배송관리-상품준비중-*.xlsx"
    }
  },
  {
    name: "G마켓 / 옥션 (ESM Plus)",
    id: "gmarket_preset",
    config: {
      identifier: "주문상태",
      start_row: 1,
      col_map: {
        용량: 6,
        상품명: 7,
        수량: 9,
        수령인: 14,
        연락처: 15,
        우편번호: 18,
        주소: 19,
        배송메시지: 20
      },
      tracking_col: 3,
      courier_col: 2,
      filepath_pattern: "input/ESM_Delivery_*.xlsx"
    }
  },
  {
    name: "11번가 (11st)",
    id: "elevenst_preset",
    config: {
      identifier: "주문번호",
      start_row: 1,
      col_map: {
        용량: 5,
        상품명: 6,
        수량: 8,
        수령인: 11,
        연락처: 12,
        우편번호: 14,
        주소: 15,
        배송메시지: 16
      },
      tracking_col: 4,
      courier_col: 3,
      filepath_pattern: "input/11st_orders_*.xlsx"
    }
  }
];

export const DEFAULT_PLATFORMS: PlatformConfig[] = [
  {
    id: "coupang",
    name: "쿠팡",
    identifier: "묶음배송번호",
    start_row: 2,
    col_map: {
      용량: 11, // L (등록옵션명)
      상품명: 12, // M (노출상품명)
      수량: 22, // W (구매수)
      수령인: 26, // AA (수취인명)
      연락처: 27, // AB (수취인번호)
      우편번호: 28, // AC (우편번호)
      주소: 29, // AD (수취인주소)
      배송메시지: 30 // AE (배송메세지)
    },
    tracking_col: 4,
    courier_col: 3,
    filepath_pattern: "input/DeliveryList([오늘날짜]).xlsx"
  },
  {
    id: "naver",
    name: "네이버 스마트스토어",
    identifier: "주문번호",
    start_row: 3,
    col_map: {
      용량: 24, // Y (등록옵션명)
      상품명: 20, // U (노출상품명)
      수량: 26, // AA (구매수)
      수령인: 13, // N (수취인명)
      연락처: 48, // AW (수취인번호)
      우편번호: 54, // BC (우편번호)
      주소: 50, // AY (수취인주소)
      배송메시지: 55 // BD (배송메세지)
    },
    tracking_col: 8, // I열
    courier_col: 7, // H열
    filepath_pattern: "input/스마트스토어_전체주문발주발송관리_[오늘날짜].xlsx"
  },
  {
    id: "toss",
    name: "토스",
    identifier: "주문배송관리",
    start_row: 3,
    col_map: {
      용량: 11, // L (등록옵션명)
      상품명: 8, // I (노출상품명)
      수량: 12, // M (구매수)
      수령인: 17, // R (수취인명)
      연락처: 18, // S (수취인번호)
      우편번호: 20, // U (우편번호)
      주소: 19, // T (수취인주소)
      배송메시지: 21 // V (배송메세지)
    },
    tracking_col: 6,
    courier_col: 5,
    filepath_pattern: "input/주문배송관리-상품준비중-*-([오늘날짜]).xlsx"
  }
];

export const DEFAULT_PRODUCT_MAPPINGS: ProductMapping[] = [
  { rawName: '국내제조 비린맛 없는 절단 돌산 간장 꽃게장', mappedName: '게장' },
  { rawName: '그린 웰빙 업소용 국산 반달 슬라이스 단무지', mappedName: '반달단무지' },
  { rawName: '그린이에프앤에스 업소용 양념깻잎', mappedName: '양념깻잎' },
  { rawName: '꼬들꼬들 간장무꼬들이 장아찌 무 장아찌', mappedName: '무꼬들' },
  { rawName: '늘푸른 뜨락 국내제조 업소용 알마늘지', mappedName: '알마늘' },
  { rawName: '더 맛있는 간장고추장아찌 고추장아찌', mappedName: '간장고추' },
  { rawName: '더 맛있는 간장고추지 업소용 고추장아찌', mappedName: '간장고추' },
  { rawName: '명태품은 백명란', mappedName: '명란' },
  { rawName: '볶아조린 국산서리태조림 업소용 콩조림', mappedName: '서리태조림' },
  { rawName: '볶아조린 대두콩조림 메주콩자반 업소용 콩조림', mappedName: '대두조림' },
  { rawName: '볶아조린 땅콩조림 업소용 콩조림', mappedName: '땅콩' },
  { rawName: '양념 반찬 여우마을 무말랭이 절임류', mappedName: '무말랭이' },
  { rawName: '업소용 대용량 단풍콩잎 장아찌', mappedName: '단풍콩잎' },
  { rawName: '업소용 매실청간장생깻잎 장아찌', mappedName: '매실깻잎' },
  { rawName: '여우마을 국내제조 국산 순태젓갈 갈치속젓', mappedName: '순태' },
  { rawName: '여우마을 국내제조 상큼상큼 오이피클', mappedName: '오이피클' },
  { rawName: '여우마을 노랑콩잎 단풍콩잎 장아찌', mappedName: '단풍콩잎' },
  { rawName: '여우마을 대구 북성로 냉동 완조리 간장 연탄불고기 5팩', mappedName: '간장연탄' },
  { rawName: '여우마을 명태품은 특 창란젓갈', mappedName: '양념창란' },
  { rawName: '여우마을 봄에새싹 명이나물 장아찌', mappedName: '명이나물' },
  { rawName: '여우마을 수제반찬 고추장 오징어실채 볶음', mappedName: '실채' },
  { rawName: '여우마을 수제반찬 국산 된장 청양고추 장아찌', mappedName: '국산된고' },
  { rawName: '여우마을 수제반찬 국산 양념 청양고추 장아찌', mappedName: '국산양고' },
  { rawName: '여우마을 수제반찬 달콤담백 양대콩조림 강낭콩조림', mappedName: '양대조림' },
  { rawName: '여우마을 수제반찬 더 맛있는 간장 청양고추장아찌', mappedName: '청양간장' },
  { rawName: '여우마을 수제반찬 더 맛있는 간장마늘쫑 업소용 마늘쫑장아찌', mappedName: '간장마늘쫑' },
  { rawName: '여우마을 수제반찬 된장깻잎 장아찌', mappedName: '된장깻잎' },
  { rawName: '여우마을 수제반찬 맛있는 오징어땅콩진미채 볶음', mappedName: '땅콩진미' },
  { rawName: '여우마을 수제반찬 매콤달콤 고추장양념 건새우볶음', mappedName: '건새우' },
  { rawName: '여우마을 수제반찬 매콤새콤 밥도둑 도라지무침 당일제조', mappedName: '도라지' },
  { rawName: '여우마을 수제반찬 볶아조린 국산서리태조림 국산 콩자반', mappedName: '서리태조림' },
  { rawName: '여우마을 수제반찬 볶아조린 대두콩조림 노란콩조림 메주콩자반', mappedName: '대두조림' },
  { rawName: '여우마을 수제반찬 볶아조린 땅콩조림 콩자반', mappedName: '땅콩' },
  { rawName: '여우마을 수제반찬 수제 완조리 냉동 소고기 육전', mappedName: '육전' },
  { rawName: '여우마을 수제반찬 아삭아삭 국산 연근조림', mappedName: '연근' },
  { rawName: '여우마을 수제반찬 아삭이고추 된장무침', mappedName: '아삭이고추' },
  { rawName: '여우마을 수제반찬 영양만점 모듬콩조림 견과류조림', mappedName: '여러콩' },
  { rawName: '여우마을 수제반찬 원하는 크기로 잘라먹는 양념 긴마늘쫑무침', mappedName: '긴마늘쫑' },
  { rawName: '여우마을 수제반찬 제주품은 국산 더덕무침', mappedName: '더덕' },
  { rawName: '여우마을 수제반찬 진짜 연탄에 구운 대구 북성로 완조리 연탄불고기 간장맛고추장맛 묶음 간장맛 고추장맛 1세트', mappedName: '연탄세트' },
  { rawName: '여우마을 수제반찬 진짜진짜 맛있는 고추장 진미채볶음', mappedName: '진미채' },
  { rawName: '여우마을 수제반찬 촌스러운 국산 우엉채조림 김밥용우엉', mappedName: '우엉' },
  { rawName: '여우마을 수제반찬 촌스러운 궁채장아찌', mappedName: '간장궁채' },
  { rawName: '여우마을 수제반찬 촌스러운 꽈리고추 고추장멸치볶음', mappedName: '멸치' },
  { rawName: '여우마을 수제반찬 촌스러운 된장고추무침 고추장아찌', mappedName: '된장고추' },
  { rawName: '여우마을 수제반찬 촌스러운 땅콩조림', mappedName: '생땅콩' },
  { rawName: '여우마을 수제반찬 촌스러운 양념고추장아찌 고추무침', mappedName: '양념고추' },
  { rawName: '여우마을 수제반찬 촌스러운 양념조개젓갈', mappedName: '양념조개' },
  { rawName: '여우마을 수제반찬 화끈하게 매운 된장땡초 청양고추무침', mappedName: '땡초' },
  { rawName: '여우마을 양념깻잎 무침 장아찌', mappedName: '양념깻잎' },
  { rawName: '여우마을 양념깻잎무침', mappedName: '양념깻잎' },
  { rawName: '여우마을 양념무말랭이 무침', mappedName: '무말랭이' },
  { rawName: '여우마을 업소용 매실청간장생깻잎 장아찌', mappedName: '매실깻잎' },
  { rawName: '여우마을 업소용 산고추', mappedName: '산고추' },
  { rawName: '여우마을 업소용 오징어젓갈', mappedName: '오징어' },
  { rawName: '여우마을 업소용 유림 양념 오징어젓갈 특오징어젓갈', mappedName: '오징어' },
  { rawName: '여우마을 자연곡물 청자5호 국산서리태 햇콩', mappedName: '곡물서리태' },
  { rawName: '여우마을 자연곡물 햇콩 붉은 강낭콩 양대콩', mappedName: '곡물강낭콩' },
  { rawName: '여우마을 쫄깃쫄깃 오징어젓갈', mappedName: '오징어' },
  { rawName: '원하프락교한양총알배송', mappedName: '락교' },
  { rawName: '지호 업소용 국내제조 고추채 절임', mappedName: '고추채' },
  { rawName: '촌스러운 양념고추장아찌 업소용 고추장아찌', mappedName: '양념고추' },
  { rawName: '하나 업소용 단무지 알밥용 김밥용', mappedName: '알밥단무지' },
  { rawName: '여우마을 수제반찬 곤약 꽈리고추 메추리알 장조림 당일제조', mappedName: '메추리알' },
  { rawName: '한정판매 국산 통마늘 장아찌 통마늘지', mappedName: '통마늘' },
  { rawName: '여우마을 대구 북성로 냉동 완조리 간장 연탄불고기 10팩', mappedName: '간장연탄' },
  { rawName: '여우마을 대구 북성로 냉동 완조리 고추장 연탄불고기', mappedName: '고추장연탄' }
];
