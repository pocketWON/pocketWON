# 개발 중 발견과 수정

- 기존 Home/Shell 테스트의 Report placeholder 기대값을 새 Report h1 및 view assertion으로 대체했다. 기존 assertion의 검증 의도는 유지한다. Shell 실패 종료 때 발생한 font ERR_ABORTED도 최종 성공 실행에서 숨기지 않고 0건을 확인한다.
- 신규 Report의 긴 이름 비교가 PW04 trim 계약을 반영하지 않아 실패했으며 기대값에 trim을 적용했다. 실제 Goal 함수는 수정하지 않았다.
- 기본 remaining 금액이 flex intrinsic width로 불필요하게 축약되어 Report 전용 grid 배치를 사용하고 기본 14,400원 비축약 검사를 추가했다.
- Goal 초기 실행 실패 결과 두 개를 원문 그대로 보존했다. 모든 기능 검증 이후 font ERR_ABORTED로 FAIL이었다. 두 번째 실행의 lastCompletedCheck 진단으로 invalid-state 검사에서 Home 진입 후 곧바로 reload하는 경로를 확인했다. layout 완료 확인 후 fonts.ready를 기다리도록 검사 종료와 모든 reload 경계를 보완했다. 이벤트를 필터링하거나 기대 오류로 제외하지 않는다.

과거 PW01~04 evidence는 변경하지 않는다. 최종 결과는 각 suite의 현재 verification.json을 기준으로 하고, 이 폴더의 개발 중 실패를 최종 PASS와 혼동하지 않는다.
