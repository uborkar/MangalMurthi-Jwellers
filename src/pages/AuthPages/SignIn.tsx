import PageMeta from "../../components/common/PageMeta";
import AuthLayout from "./AuthPageLayout";
import SignInForm from "../../components/auth/SignInForm";

export default function SignIn() {
  return (
    <>
      <PageMeta
        title="MangalMurti Distrubutors"
        description="This is the dashboard home page of MangalMurti Distrubutors admin panel."
      />
      <AuthLayout>
        <SignInForm />
      </AuthLayout>
    </>
  );
}
