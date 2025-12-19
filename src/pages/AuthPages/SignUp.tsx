import PageMeta from "../../components/common/PageMeta";
import AuthLayout from "./AuthPageLayout";
import SignUpForm from "../../components/auth/SignUpForm";

export default function SignUp() {
  return (
    <>
      <PageMeta
        title="MangalMurti Distrubutors"
        description="This is the dashboard home page of MangalMurti Distrubutors admin panel."
      />
      <AuthLayout>
        <SignUpForm />
      </AuthLayout>
    </>
  );
}
