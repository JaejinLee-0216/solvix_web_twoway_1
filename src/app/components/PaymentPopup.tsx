interface PaymentPopupProps {
  isOpen: boolean;
  onClose: () => void;
  planType: "basic" | "pro" | "ultra";
}

export default function PaymentPopup({ isOpen, onClose, planType }: PaymentPopupProps) {
  if (!isOpen) return null;

  const planInfo = {
    basic: {
      name: "Basic",
      price: "무료",
      description: "기본 문제 풀이 기능",
      features: ["하루 5회 문제 풀이", "기본 해설 제공", "이메일 지원"]
    },
    pro: {
      name: "Pro",
      price: "월 29,000원",
      description: "고급 문제 풀이 및 첨삭",
      features: ["무제한 문제 풀이", "상세 해설 및 첨삭", "우선 지원", "고급 분석 도구"]
    },
    ultra: {
      name: "Ultra",
      price: "월 39,000원",
      description: "최고급 AI 튜터링",
      features: ["무제한 모든 기능", "1:1 맞춤 학습", "전화 지원", "개인 학습 계획", "성적 분석 리포트"]
    }
  };

  const currentPlan = planInfo[planType];

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800">결제하기</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl"
          >
            ×
          </button>
        </div>

        {/* Plan Info */}
        <div className="mb-6">
          <div className="bg-blue-50 rounded-lg p-4 mb-4">
            <h3 className="text-xl font-semibold text-blue-900 mb-2">{currentPlan.name}</h3>
            <p className="text-3xl font-bold text-blue-600 mb-2">{currentPlan.price}</p>
            <p className="text-gray-600">{currentPlan.description}</p>
          </div>

          <ul className="space-y-2">
            {currentPlan.features.map((feature, index) => (
              <li key={index} className="flex items-center text-gray-700">
                <svg className="w-5 h-5 text-green-500 mr-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                {feature}
              </li>
            ))}
          </ul>
        </div>

        {/* Payment Methods */}
        <div className="mb-6">
          <h4 className="text-lg font-semibold text-gray-800 mb-3">결제 방법</h4>
          <div className="space-y-3">
            <button className="w-full p-3 border-2 border-gray-200 rounded-lg hover:border-blue-500 transition-colors text-left">
              <div className="flex items-center">
                <div className="w-8 h-8 bg-yellow-400 rounded mr-3 flex items-center justify-center">
                  <span className="text-white font-bold text-sm">카</span>
                </div>
                <span className="text-gray-700">카카오페이</span>
              </div>
            </button>
            <button className="w-full p-3 border-2 border-gray-200 rounded-lg hover:border-blue-500 transition-colors text-left">
              <div className="flex items-center">
                <div className="w-8 h-8 bg-blue-600 rounded mr-3 flex items-center justify-center">
                  <span className="text-white font-bold text-sm">N</span>
                </div>
                <span className="text-gray-700">네이버페이</span>
              </div>
            </button>
            <button className="w-full p-3 border-2 border-gray-200 rounded-lg hover:border-blue-500 transition-colors text-left">
              <div className="flex items-center">
                <div className="w-8 h-8 bg-gray-800 rounded mr-3 flex items-center justify-center">
                  <span className="text-white font-bold text-sm">C</span>
                </div>
                <span className="text-gray-700">신용카드</span>
              </div>
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 px-4 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
          >
            취소
          </button>
          <button
            onClick={() => {
              alert(`${currentPlan.name} 플랜 결제가 진행됩니다. (포트원 연동 예정)`);
              onClose();
            }}
            className="flex-1 py-3 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            결제하기
          </button>
        </div>

        {/* Footer Note */}
        <p className="text-xs text-gray-500 text-center mt-4">
          * 포트원(PortOne) 결제 시스템 연동 예정
        </p>
      </div>
    </div>
  );
}
