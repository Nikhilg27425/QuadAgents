import { Leaf } from "lucide-react";

export default function LoginPage() {

  const login = () => {
  window.location.href =
    "https://ap-south-1tu27dcuk2.auth.ap-south-1.amazoncognito.com/login" +
    "?client_id=dlad803ahh5qm997f9mo9vi7d" +
    "&response_type=code" +
    "&scope=openid+email+phone" +
    "&redirect_uri=https://d2cenfqtilq1ns.cloudfront.net/";
};

  return (
    <div className="min-h-screen flex flex-col gradient-hero">

      <div className="flex-1 flex flex-col items-center justify-center px-6 pt-16 pb-8 text-primary-foreground">

        <div className="w-20 h-20 rounded-3xl bg-secondary flex items-center justify-center mb-6 shadow-lg">
          <Leaf size={40} className="text-primary" />
        </div>

        <h1 className="text-4xl font-bold text-center mb-2">
          कृषि सहायक
        </h1>

        <p className="text-lg text-center opacity-90 font-medium">
          Krishi Sahaayak
        </p>

        <p className="text-base text-center opacity-70 mt-2 max-w-xs">
          आपका AI-powered खेती सहायक
        </p>

        <button
          onClick={login}
          className="btn-primary mt-8 px-8 py-4 text-lg"
        >
          लॉगिन करें
        </button>

      </div>

    </div>
  );
}
